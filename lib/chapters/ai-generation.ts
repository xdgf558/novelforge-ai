import { buildChapterBeatContext } from "@/lib/ai/chapter-beats";
import {
  buildChapterDraftContext,
  hasConfirmedChapterBeats,
} from "@/lib/ai/chapter-drafts";
import {
  buildChapterPolishContext,
  buildSegmentedChapterPolishContext,
  hasPolishableChapterText,
  shouldSegmentChapterPolish,
} from "@/lib/ai/chapter-polishes";
import { normalizeChapterPlatformTemplate } from "@/lib/ai/chapter-platform-templates";
import {
  buildChapterSummaryContext,
  hasConfirmedChapterText,
} from "@/lib/ai/chapter-summaries";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { completeRunningSegmentedChapterPolishTask } from "@/lib/ai/segmented-chapter-polish-runner";
import {
  createAiTask,
  markAiTaskRunning,
  startLoggedOpenAITextTask,
} from "@/lib/ai/task-logger";
import { findActiveChapterAiTask } from "@/lib/chapters/ai-tasks";
import { chapterFinalTextHash } from "@/lib/chapters/source-text";
import { persistChapterSummaryFromTask } from "@/lib/chapters/summaries";
import { persistAutomaticForeshadowRecoverySuggestions } from "@/lib/foreshadows/recovery-records";
import {
  loadChapterBeatContext,
  loadChapterDraftContext,
  loadChapterPolishContext,
  loadChapterSummaryContext,
} from "@/lib/chapters/context";

const chapterBeatTemplateKey = "chapter_beat_generation";
const chapterDraftTemplateKey = "chapter_draft_generation";
const chapterPolishTemplateKey = "chapter_polish_generation";
const chapterSummaryTemplateKey = "chapter_summary_extraction";

export type ChapterAiGenerationResult =
  | {
      status: "active_task";
    }
  | {
      status: "missing_required_input";
    }
  | {
      status: "started";
    };

export async function startChapterBeatGeneration(
  projectId: string,
  chapterId: string,
): Promise<ChapterAiGenerationResult> {
  const activeTask = await findActiveChapterAiTask(
    projectId,
    chapterId,
    "chapter_beat_generation",
  );

  if (activeTask) {
    return {
      status: "active_task",
    };
  }

  const contextInput = await loadChapterBeatContext(projectId, chapterId);
  const template = await ensureDefaultPromptTemplate(
    projectId,
    chapterBeatTemplateKey,
  );
  const context = buildChapterBeatContext(contextInput);

  await startLoggedOpenAITextTask(
    {
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
    },
    {
      systemPrompt: template.systemPrompt,
      developerPrompt: [template.userPrompt, template.contextNotes]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  return {
    status: "started",
  };
}

export async function startChapterDraftGeneration(
  projectId: string,
  chapterId: string,
  platformTemplateValue?: unknown,
): Promise<ChapterAiGenerationResult> {
  const activeTask = await findActiveChapterAiTask(
    projectId,
    chapterId,
    "chapter_draft_generation",
  );

  if (activeTask) {
    return {
      status: "active_task",
    };
  }

  const contextInput = await loadChapterDraftContext(projectId, chapterId);

  if (!hasConfirmedChapterBeats(contextInput.chapter)) {
    return {
      status: "missing_required_input",
    };
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    chapterDraftTemplateKey,
  );
  const context = buildChapterDraftContext(contextInput, {
    platformTemplate: normalizeChapterPlatformTemplate(platformTemplateValue),
  });

  await startLoggedOpenAITextTask(
    {
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
    },
    {
      systemPrompt: template.systemPrompt,
      developerPrompt: [template.userPrompt, template.contextNotes]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  return {
    status: "started",
  };
}

export async function startChapterPolishGeneration(
  projectId: string,
  chapterId: string,
  platformTemplateValue?: unknown,
): Promise<ChapterAiGenerationResult> {
  const activeTask = await findActiveChapterAiTask(
    projectId,
    chapterId,
    "chapter_polish_generation",
  );

  if (activeTask) {
    return {
      status: "active_task",
    };
  }

  const contextInput = await loadChapterPolishContext(projectId, chapterId);

  if (!hasPolishableChapterText(contextInput.chapter)) {
    return {
      status: "missing_required_input",
    };
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    chapterPolishTemplateKey,
  );
  const platformTemplate = normalizeChapterPlatformTemplate(
    platformTemplateValue,
  );

  if (shouldSegmentChapterPolish(contextInput)) {
    const context = buildSegmentedChapterPolishContext(contextInput, {
      platformTemplate,
    });
    const task = await createAiTask({
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
    });
    const runningTask = await markAiTaskRunning(task.id);

    void completeRunningSegmentedChapterPolishTask(runningTask.id).catch(
      (error) => {
        console.error("Background segmented chapter polish failed:", error);
      },
    );

    return {
      status: "started",
    };
  }

  const context = buildChapterPolishContext(contextInput, {
    platformTemplate,
  });

  await startLoggedOpenAITextTask(
    {
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
    },
    {
      systemPrompt: template.systemPrompt,
      developerPrompt: [template.userPrompt, template.contextNotes]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  return {
    status: "started",
  };
}

export async function startChapterSummaryGeneration(
  projectId: string,
  chapterId: string,
): Promise<ChapterAiGenerationResult> {
  const activeTask = await findActiveChapterAiTask(
    projectId,
    chapterId,
    "chapter_summary_extraction",
  );

  if (activeTask) {
    return {
      status: "active_task",
    };
  }

  const contextInput = await loadChapterSummaryContext(projectId, chapterId);

  if (!hasConfirmedChapterText(contextInput.chapter)) {
    return {
      status: "missing_required_input",
    };
  }

  const sourceTextHash = chapterFinalTextHash(contextInput.chapter.finalText);

  if (!sourceTextHash) {
    return {
      status: "missing_required_input",
    };
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    chapterSummaryTemplateKey,
  );
  const context = buildChapterSummaryContext(contextInput);

  await startLoggedOpenAITextTask(
    {
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: {
        ...context.inputJson,
        finalTextHash: sourceTextHash,
      },
    },
    {
      systemPrompt: template.systemPrompt,
      developerPrompt: [
        template.userPrompt,
        template.contextNotes,
        template.responseSchema
          ? `请严格输出符合以下 JSON Schema 的 JSON：\n${template.responseSchema}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
    {
      onCompleted: async (task) => {
        await persistChapterSummaryFromTask({
          projectId,
          chapterId,
          sourceTextHash,
          task,
        });

        await persistAutomaticForeshadowRecoverySuggestions({
          projectId,
          task,
          fallbackChapterId: chapterId,
          foreshadows: contextInput.foreshadows ?? [],
          chapters: [
            {
              id: chapterId,
              chapterNumber: contextInput.chapter.chapterNumber,
              title: contextInput.chapter.title,
              summary: `第 ${contextInput.chapter.chapterNumber} 章定稿正文`,
              finalText: contextInput.chapter.finalText,
            },
          ],
        });
      },
    },
  );

  return {
    status: "started",
  };
}
