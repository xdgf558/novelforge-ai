import type { PendingUpdate, Prisma } from "@prisma/client";
import { chapterFinalTextHash, chapterSourceMatches } from "@/lib/chapters/source-text";
import {
  applyApprovedPendingUpdate,
  PendingUpdateTargetNotFoundError,
} from "@/lib/pending-updates/approval";
import { prisma } from "@/lib/prisma";
import {
  automaticForeshadowRecoverySource,
  buildAutomaticForeshadowRecoveryPayload,
  parseAutomaticForeshadowRecoveryPayload,
  parseForeshadowRecoverySignals,
  type ForeshadowRecoveryAuditForeshadow,
  type ForeshadowRecoveryChapterEvidence,
} from "./recovery-audit";

type RecoveryTask = {
  id: string;
  outputText?: string | null;
};

type RecoveryPendingUpdate = PendingUpdate & {
  chapter?: {
    finalText?: string | null;
  } | null;
};

export async function persistAutomaticForeshadowRecoverySuggestions({
  chapters,
  fallbackChapterId,
  foreshadows,
  projectId,
  task,
}: {
  chapters: readonly ForeshadowRecoveryChapterEvidence[];
  fallbackChapterId?: string;
  foreshadows: readonly ForeshadowRecoveryAuditForeshadow[];
  projectId: string;
  task: RecoveryTask;
}) {
  const signals = parseForeshadowRecoverySignals(
    task.outputText,
    fallbackChapterId,
  ).filter((signal) => signal.confidence !== "low");

  if (signals.length === 0) {
    return 0;
  }

  const foreshadowById = new Map(
    foreshadows.map((foreshadow) => [foreshadow.id, foreshadow]),
  );
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const validSignals = signals.filter((signal) => {
    const foreshadow = foreshadowById.get(signal.targetId);
    const chapter = chapterById.get(signal.resolvedChapterId);

    if (!foreshadow || !chapter) {
      return false;
    }

    return (
      foreshadow.plantedChapterNumber == null ||
      chapter.chapterNumber >= foreshadow.plantedChapterNumber
    );
  });

  if (validSignals.length === 0) {
    return 0;
  }

  return prisma.$transaction(async (tx) => {
    const targetIds = [...new Set(validSignals.map((signal) => signal.targetId))];
    const currentForeshadows = await tx.foreshadow.findMany({
      where: {
        id: {
          in: targetIds,
        },
        projectId,
        status: {
          in: ["planted", "advancing", "needs_attention"],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });
    const recoverableIds = new Set(currentForeshadows.map((item) => item.id));
    const existingUpdates = await tx.pendingUpdate.findMany({
      where: {
        projectId,
        targetType: "foreshadow",
        targetId: {
          in: targetIds,
        },
        status: "pending",
      },
      select: {
        targetId: true,
      },
    });
    const pendingTargetIds = new Set(
      existingUpdates.flatMap((update) =>
        update.targetId ? [update.targetId] : [],
      ),
    );
    let createdCount = 0;

    for (const signal of validSignals) {
      const foreshadow = foreshadowById.get(signal.targetId);
      const chapter = chapterById.get(signal.resolvedChapterId);

      if (
        !foreshadow ||
        !chapter ||
        !recoverableIds.has(signal.targetId) ||
        pendingTargetIds.has(signal.targetId)
      ) {
        continue;
      }

      const sourceTextHash = chapterFinalTextHash(chapter.finalText);

      if (!sourceTextHash) {
        continue;
      }

      await tx.pendingUpdate.create({
        data: {
          projectId,
          chapterId: chapter.id,
          aiTaskId: task.id,
          updateType: signal.action === "resolve" ? "resolve" : "update",
          targetType: "foreshadow",
          targetId: signal.targetId,
          targetName: clipLabel(foreshadow.content),
          fieldName: "status",
          title:
            signal.action === "resolve"
              ? `自动识别回收：${clipLabel(foreshadow.content, 72)}`
              : `自动识别推进：${clipLabel(foreshadow.content, 72)}`,
          proposedContent: signal.summary,
          reason:
            signal.action === "resolve"
              ? `章节证据表明该伏笔的核心疑问已经兑现；识别置信度：${confidenceLabel(signal.confidence)}。`
              : `章节证据表明该伏笔已取得实质推进，但尚未完全兑现；识别置信度：${confidenceLabel(signal.confidence)}。`,
          riskLevel: foreshadow.importance === "high" ? "medium" : "low",
          evidence: signal.evidence,
          payloadJson: buildAutomaticForeshadowRecoveryPayload(signal),
          sourceTextHash,
        },
      });
      pendingTargetIds.add(signal.targetId);
      createdCount += 1;
    }

    return createdCount;
  });
}

export async function findAutomaticForeshadowRecoveryCandidates(
  projectId: string,
) {
  const updates = await prisma.pendingUpdate.findMany({
    where: {
      projectId,
      status: "pending",
      targetType: "foreshadow",
      updateType: "resolve",
      payloadJson: {
        contains: automaticForeshadowRecoverySource,
      },
    },
    include: {
      chapter: {
        select: {
          finalText: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return updates.filter((update) => {
    const payload = parseAutomaticForeshadowRecoveryPayload(update.payloadJson);

    return (
      payload?.action === "resolve" &&
      payload.confidence === "high" &&
      (!update.sourceTextHash ||
        chapterSourceMatches(update.sourceTextHash, update.chapter?.finalText))
    );
  });
}

export async function countAutomaticForeshadowRecoveryCandidates(
  projectId: string,
) {
  return (await findAutomaticForeshadowRecoveryCandidates(projectId)).length;
}

export async function approveAutomaticForeshadowRecoveries(projectId: string) {
  const candidates = await findAutomaticForeshadowRecoveryCandidates(projectId);

  if (candidates.length === 0) {
    return {
      approvedCount: 0,
      skippedCount: 0,
    };
  }

  return prisma.$transaction(async (tx) => {
    const targetIds = candidates.flatMap((candidate) =>
      candidate.targetId ? [candidate.targetId] : [],
    );
    const chapterIds = candidates.flatMap((candidate) =>
      candidate.chapterId ? [candidate.chapterId] : [],
    );
    const currentTargets = await tx.foreshadow.findMany({
      where: {
        id: {
          in: targetIds,
        },
        projectId,
        status: {
          in: ["planted", "advancing", "needs_attention"],
        },
      },
      select: {
        id: true,
      },
    });
    const currentChapters = await tx.chapter.findMany({
      where: {
        id: {
          in: chapterIds,
        },
        projectId,
      },
      select: {
        id: true,
        finalText: true,
      },
    });
    const currentTargetIds = new Set(currentTargets.map((target) => target.id));
    const currentFinalTextByChapterId = new Map(
      currentChapters.map((chapter) => [chapter.id, chapter.finalText]),
    );
    let approvedCount = 0;
    let skippedCount = 0;

    for (const candidate of candidates) {
      const currentFinalText = candidate.chapterId
        ? currentFinalTextByChapterId.get(candidate.chapterId)
        : undefined;

      if (
        !candidate.targetId ||
        !currentTargetIds.has(candidate.targetId) ||
        (candidate.sourceTextHash &&
          !chapterSourceMatches(candidate.sourceTextHash, currentFinalText))
      ) {
        skippedCount += 1;
        continue;
      }

      try {
        await applyApprovedPendingUpdate(
          tx,
          candidate as RecoveryPendingUpdate,
          candidate.proposedContent,
        );
      } catch (error) {
        if (error instanceof PendingUpdateTargetNotFoundError) {
          skippedCount += 1;
          continue;
        }

        throw error;
      }

      await tx.pendingUpdate.update({
        where: {
          id: candidate.id,
        },
        data: {
          status: "approved",
          resolutionNote: "作者批量确认自动识别的伏笔回收。",
          appliedAt: new Date(),
        },
      });
      approvedCount += 1;
    }

    return {
      approvedCount,
      skippedCount,
    };
  });
}

function clipLabel(value: string, limit = 160) {
  const cleaned = value.trim().replace(/\s+/g, " ");

  return cleaned.length <= limit ? cleaned : `${cleaned.slice(0, limit - 1)}…`;
}

function confidenceLabel(value: string) {
  return value === "high" ? "高" : value === "medium" ? "中" : "低";
}
