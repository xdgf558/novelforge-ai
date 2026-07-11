import { buildPromptSourceText } from "@/lib/ai/chapter-summaries";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import { chapterFinalTextHash } from "@/lib/chapters/source-text";
import { prisma } from "@/lib/prisma";
import {
  buildForeshadowRecoveryAuditContext,
  compactChapterSummaryForRecovery,
  foreshadowTextOverlapScore,
  type ForeshadowRecoveryAuditForeshadow,
  type ForeshadowRecoveryChapterEvidence,
} from "./recovery-audit";
import { persistAutomaticForeshadowRecoverySuggestions } from "./recovery-records";

export const foreshadowRecoveryAuditTaskType = "foreshadow_recovery_audit";
export const foreshadowRecoveryAuditTemplateKey = "foreshadow_recovery_audit";

const auditBatchSize = 12;
const chapterEvidenceLimit = 24;

type HistoricalRecoveryAuditBatch = {
  chapters: ForeshadowRecoveryChapterEvidence[];
  foreshadows: ForeshadowRecoveryAuditForeshadow[];
};

export type HistoricalForeshadowRecoveryAuditResult =
  | { status: "active_task" }
  | { status: "nothing_to_scan" }
  | { status: "started"; batchCount: number; foreshadowCount: number };

export async function startHistoricalForeshadowRecoveryAudit(
  projectId: string,
): Promise<HistoricalForeshadowRecoveryAuditResult> {
  const activeTask = await prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: foreshadowRecoveryAuditTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });

  if (activeTask) {
    return { status: "active_task" };
  }

  const auditInput = await loadHistoricalForeshadowRecoveryAuditBatches(projectId);

  if (!auditInput || auditInput.batches.length === 0) {
    return { status: "nothing_to_scan" };
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    foreshadowRecoveryAuditTemplateKey,
  );

  await startRecoveryAuditBatch({
    batchIndex: 0,
    batches: auditInput.batches,
    projectId,
    projectTitle: auditInput.projectTitle,
    template,
  });

  return {
    status: "started",
    batchCount: auditInput.batches.length,
    foreshadowCount: auditInput.batches.reduce(
      (count, batch) => count + batch.foreshadows.length,
      0,
    ),
  };
}

async function startRecoveryAuditBatch({
  batchIndex,
  batches,
  projectId,
  projectTitle,
  template,
}: {
  batchIndex: number;
  batches: readonly HistoricalRecoveryAuditBatch[];
  projectId: string;
  projectTitle: string;
  template: Awaited<ReturnType<typeof ensureDefaultPromptTemplate>>;
}) {
  const batch = batches[batchIndex];

  if (!batch) {
    return;
  }

  const context = buildForeshadowRecoveryAuditContext({
    projectTitle,
    foreshadows: batch.foreshadows,
    chapters: batch.chapters,
  });
  const startNextBatch = () =>
    startRecoveryAuditBatch({
      batchIndex: batchIndex + 1,
      batches,
      projectId,
      projectTitle,
      template,
    });

  await startLoggedOpenAITextTask(
    {
      projectId,
      taskType: template.taskType,
      model: undefined,
      promptTemplateId: template.id,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
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
        await persistAutomaticForeshadowRecoverySuggestions({
          projectId,
          task,
          foreshadows: batch.foreshadows,
          chapters: batch.chapters,
        });
        try {
          await startNextBatch();
        } catch (error) {
          console.error(
            "Failed to start the next foreshadow audit batch:",
            error,
          );
        }
      },
      onFailed: async () => {
        await startNextBatch();
      },
    },
  );
}

export async function loadHistoricalForeshadowRecoveryAuditBatches(
  projectId: string,
) {
  const [project, foreshadows, chapters, summaries, pendingTargets] =
    await Promise.all([
      prisma.project.findUnique({
        where: {
          id: projectId,
        },
        select: {
          title: true,
        },
      }),
      prisma.foreshadow.findMany({
        where: {
          projectId,
          status: {
            in: ["planted", "advancing", "needs_attention"],
          },
        },
        select: {
          id: true,
          content: true,
          status: true,
          importance: true,
          expectedResolveChapter: true,
          plantedChapterId: true,
          plantedChapter: {
            select: {
              chapterNumber: true,
            },
          },
        },
        orderBy: [
          { expectedResolveChapter: "asc" },
          { importance: "desc" },
          { updatedAt: "asc" },
        ],
      }),
      prisma.chapter.findMany({
        where: {
          projectId,
          finalText: {
            not: null,
          },
        },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          finalText: true,
        },
        orderBy: {
          chapterNumber: "asc",
        },
      }),
      prisma.chapterSummary.findMany({
        where: {
          projectId,
        },
        select: {
          id: true,
          chapterId: true,
          outputText: true,
          sourceTextHash: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.pendingUpdate.findMany({
        where: {
          projectId,
          status: "pending",
          targetType: "foreshadow",
          targetId: {
            not: null,
          },
        },
        select: {
          targetId: true,
        },
      }),
    ]);

  if (!project) {
    return null;
  }

  const pendingTargetIds = new Set(
    pendingTargets.flatMap((update) => (update.targetId ? [update.targetId] : [])),
  );
  const candidates = foreshadows
    .filter((foreshadow) => !pendingTargetIds.has(foreshadow.id))
    .map((foreshadow) => ({
      id: foreshadow.id,
      content: foreshadow.content,
      status: foreshadow.status,
      importance: foreshadow.importance,
      expectedResolveChapter: foreshadow.expectedResolveChapter,
      plantedChapterId: foreshadow.plantedChapterId,
      plantedChapterNumber: foreshadow.plantedChapter?.chapterNumber ?? null,
    }));
  const currentSummaryByChapterId = currentSummaryMap(chapters, summaries);
  const chapterEvidence = chapters.map((chapter) => {
    const summary = currentSummaryByChapterId.get(chapter.id);

    return {
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      summary:
        compactChapterSummaryForRecovery(summary?.outputText) ||
        finalTextRecoveryExcerpt(chapter.finalText),
      finalText: chapter.finalText,
    } satisfies ForeshadowRecoveryChapterEvidence;
  });
  const batches = chunk(candidates, auditBatchSize).flatMap((batch) => {
    const evidence = selectChapterEvidenceForBatch(batch, chapterEvidence);

    return evidence.length > 0
      ? [
          {
            foreshadows: batch,
            chapters: evidence,
          } satisfies HistoricalRecoveryAuditBatch,
        ]
      : [];
  });

  return {
    projectTitle: project.title,
    batches,
  };
}

function currentSummaryMap(
  chapters: readonly { id: string; finalText?: string | null }[],
  summaries: readonly {
    chapterId: string;
    outputText: string;
    sourceTextHash?: string | null;
  }[],
) {
  const currentHashByChapterId = new Map(
    chapters.flatMap((chapter) => {
      const hash = chapterFinalTextHash(chapter.finalText);

      return hash ? [[chapter.id, hash] as const] : [];
    }),
  );
  const result = new Map<string, (typeof summaries)[number]>();

  for (const summary of summaries) {
    if (
      !result.has(summary.chapterId) &&
      currentHashByChapterId.get(summary.chapterId) === summary.sourceTextHash
    ) {
      result.set(summary.chapterId, summary);
    }
  }

  return result;
}

function selectChapterEvidenceForBatch(
  foreshadows: readonly ForeshadowRecoveryAuditForeshadow[],
  chapters: readonly ForeshadowRecoveryChapterEvidence[],
) {
  const minimumPlantedChapter = Math.min(
    ...foreshadows.map((foreshadow) => foreshadow.plantedChapterNumber ?? 1),
  );
  const eligibleChapters = chapters.filter(
    (chapter) => chapter.chapterNumber >= minimumPlantedChapter,
  );
  const selectedById = new Map<string, ForeshadowRecoveryChapterEvidence>();

  for (const foreshadow of foreshadows) {
    const scopedChapters = eligibleChapters.filter(
      (chapter) =>
        chapter.chapterNumber >= (foreshadow.plantedChapterNumber ?? 1),
    );
    const bestMention = [...scopedChapters].sort((left, right) => {
      return (
        foreshadowTextOverlapScore(foreshadow.content, right.summary) -
          foreshadowTextOverlapScore(foreshadow.content, left.summary) ||
        right.chapterNumber - left.chapterNumber
      );
    })[0];
    const anchor =
      bestMention &&
      foreshadowTextOverlapScore(foreshadow.content, bestMention.summary) >= 2
        ? bestMention
        : nearestExpectedChapter(scopedChapters, foreshadow.expectedResolveChapter) ??
          scopedChapters[scopedChapters.length - 1];

    if (anchor) {
      selectedById.set(anchor.id, anchor);
    }
  }

  const remainingChapters = eligibleChapters
    .filter((chapter) => !selectedById.has(chapter.id))
    .sort((left, right) => {
      return (
        batchOverlapScore(foreshadows, right) -
          batchOverlapScore(foreshadows, left) ||
        right.chapterNumber - left.chapterNumber
      );
    });

  return [...selectedById.values(), ...remainingChapters]
    .slice(0, chapterEvidenceLimit)
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
}

function nearestExpectedChapter(
  chapters: readonly ForeshadowRecoveryChapterEvidence[],
  expectedChapter?: number | null,
) {
  if (expectedChapter == null) {
    return null;
  }

  return [...chapters].sort((left, right) => {
    return (
      Math.abs(left.chapterNumber - expectedChapter) -
        Math.abs(right.chapterNumber - expectedChapter) ||
      right.chapterNumber - left.chapterNumber
    );
  })[0];
}

function batchOverlapScore(
  foreshadows: readonly ForeshadowRecoveryAuditForeshadow[],
  chapter: ForeshadowRecoveryChapterEvidence,
) {
  return Math.max(
    0,
    ...foreshadows.map((foreshadow) =>
      foreshadowTextOverlapScore(foreshadow.content, chapter.summary),
    ),
  );
}

function finalTextRecoveryExcerpt(finalText?: string | null) {
  const promptText = buildPromptSourceText(finalText?.trim() ?? "").text;

  if (promptText.length <= 700) {
    return promptText;
  }

  return `${promptText.slice(0, 350).trim()}\n……\n${promptText.slice(-350).trim()}`;
}

function chunk<T>(values: readonly T[], size: number) {
  const result: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
}
