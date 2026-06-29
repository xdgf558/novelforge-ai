import {
  buildSegmentedChapterPolishContext,
  hashText,
  isSegmentedChapterPolishInputJson,
  polishableChapterText,
  type ChapterPolishChapterContext,
  type ChapterPolishContextInput,
} from "@/lib/ai/chapter-polishes";
import { createOpenAITextResponse } from "@/lib/ai/openai-client";
import {
  markAiTaskCompleted,
  markAiTaskFailed,
  resolveAiTaskExecutionEnv,
  resolveAiTaskRequestTimeoutMs,
} from "@/lib/ai/task-logger";
import { prisma } from "@/lib/prisma";

type RunningSegmentedPolishTask = {
  id: string;
  projectId: string;
  chapterId: string | null;
  taskType: string;
  model: string;
  inputJson: string | null;
  promptTemplate: {
    systemPrompt: string;
    userPrompt: string;
    contextNotes: string | null;
  } | null;
};

type SegmentedPolishTaskSnapshot = {
  sourceTextLength: number | null;
  sourceTextHash: string | null;
  segmentCount: number | null;
};

export async function completeRunningSegmentedChapterPolishTask(taskId: string) {
  const task = await prisma.aiTask.findFirst({
    where: {
      id: taskId,
      taskType: "chapter_polish_generation",
      status: "running",
    },
    select: {
      id: true,
      projectId: true,
      chapterId: true,
      taskType: true,
      model: true,
      inputJson: true,
      promptTemplate: {
        select: {
          systemPrompt: true,
          userPrompt: true,
          contextNotes: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("无效的分段精修任务。");
  }

  try {
    return await runSegmentedChapterPolishTask(task);
  } catch (error) {
    await markAiTaskFailed(task.id, error);
    throw error;
  }
}

async function runSegmentedChapterPolishTask(
  task: RunningSegmentedPolishTask,
) {
  if (!task.chapterId) {
    throw new Error("分段精修任务缺少章节关联。");
  }

  if (!task.promptTemplate) {
    throw new Error("分段精修任务缺少提示词模板。");
  }

  const snapshot = parseSegmentedPolishTaskSnapshot(task.inputJson);
  const contextInput = await loadChapterPolishContext(
    task.projectId,
    task.chapterId,
  );
  const sourceText = polishableChapterText(contextInput.chapter);

  if (!sourceText) {
    throw new Error("分段精修任务缺少可精修正文。");
  }

  const context = buildSegmentedChapterPolishContext(contextInput);

  if (
    snapshot.sourceTextLength !== null &&
    snapshot.sourceTextLength !== sourceText.length
  ) {
    throw new Error("章节正文已变化，请重新生成分段精修任务。");
  }

  if (!snapshot.sourceTextHash) {
    throw new Error("分段精修任务缺少正文哈希，请重新生成分段精修任务。");
  }

  if (snapshot.sourceTextHash !== hashText(sourceText)) {
    throw new Error("章节正文已变化，请重新生成分段精修任务。");
  }

  if (
    snapshot.segmentCount !== null &&
    snapshot.segmentCount !== context.segments.length
  ) {
    throw new Error("章节分段计划已变化，请重新生成分段精修任务。");
  }

  const developerPrompt = [
    task.promptTemplate.userPrompt,
    task.promptTemplate.contextNotes,
  ]
    .filter(Boolean)
    .join("\n\n");

  const completedSegments = [];
  let tokenInput = 0;
  let tokenOutput = 0;
  let tokenTotal = 0;

  for (const segment of context.segments) {
    const result = await createOpenAITextResponse({
      model: task.model,
      systemPrompt: task.promptTemplate.systemPrompt,
      developerPrompt,
      input: segment.inputText,
    }, {
      env: resolveAiTaskExecutionEnv(task),
      timeoutMs: resolveAiTaskRequestTimeoutMs(task.taskType),
    });
    const outputText = cleanSegmentedPolishOutput(result.outputText);

    if (!outputText) {
      throw new Error(
        `第 ${segment.segment.index} / ${segment.segment.count} 段精修没有返回可用正文。`,
      );
    }

    completedSegments.push({
      index: segment.segment.index,
      inputLength: segment.segment.sourceTextLength,
      outputLength: outputText.length,
      outputText,
      usage: result.usage,
    });
    tokenInput += result.usage.inputTokens ?? 0;
    tokenOutput += result.usage.outputTokens ?? 0;
    tokenTotal += result.usage.totalTokens ?? 0;
  }

  const outputText = completedSegments
    .map((segment) => segment.outputText)
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (!outputText) {
    throw new Error("分段精修没有返回可用正文。");
  }

  return markAiTaskCompleted(task.id, {
    outputText,
    outputJson: {
      strategy: "segmented",
      segmentCount: completedSegments.length,
      segments: completedSegments.map((segment) => ({
        index: segment.index,
        inputLength: segment.inputLength,
        outputLength: segment.outputLength,
        usage: segment.usage,
      })),
    },
    tokenInput: tokenInput || undefined,
    tokenOutput: tokenOutput || undefined,
    tokenTotal: tokenTotal || undefined,
  });
}

function parseSegmentedPolishTaskSnapshot(
  inputJson?: string | null,
): SegmentedPolishTaskSnapshot {
  if (!isSegmentedChapterPolishInputJson(inputJson)) {
    throw new Error("无效的分段精修任务输入。");
  }

  const parsed = JSON.parse(inputJson || "{}") as {
    chapter?: {
      sourceTextLength?: unknown;
      sourceTextHash?: unknown;
      segmentCount?: unknown;
    };
  };
  const sourceTextLength = Number(parsed.chapter?.sourceTextLength);
  const sourceTextHash =
    typeof parsed.chapter?.sourceTextHash === "string"
      ? parsed.chapter.sourceTextHash.trim()
      : "";
  const segmentCount = Number(parsed.chapter?.segmentCount);

  return {
    sourceTextLength:
      Number.isInteger(sourceTextLength) && sourceTextLength >= 0
        ? sourceTextLength
        : null,
    sourceTextHash: sourceTextHash || null,
    segmentCount:
      Number.isInteger(segmentCount) && segmentCount > 0 ? segmentCount : null,
  };
}

async function loadChapterPolishContext(
  projectId: string,
  chapterId: string,
): Promise<ChapterPolishContextInput> {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          genre: true,
          targetAudience: true,
          platform: true,
          chapterWordMin: true,
          chapterWordMax: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new Error("分段精修任务关联的章节不存在。");
  }

  const [setting, characters] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: {
        name: "asc",
      },
      take: 12,
    }),
  ]);

  return {
    project: chapter.project,
    setting,
    chapter: pickChapterPolishContext(chapter),
    characters,
  };
}

function pickChapterPolishContext(
  chapter: ChapterPolishChapterContext,
): ChapterPolishChapterContext {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    draftText: chapter.draftText,
    polishedText: chapter.polishedText,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function cleanSegmentedPolishOutput(outputText: string) {
  return outputText
    .trim()
    .replace(/^#{1,6}\s*第\s*\d+\s*段[^\n]*\n+/i, "")
    .replace(/^第\s*\d+\s*段[：:，,\s-]*/i, "")
    .replace(/^本段精修(?:如下|稿)?[：:\s]*/i, "")
    .trim();
}
