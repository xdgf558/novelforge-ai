import type { Prisma } from "@prisma/client";

import type { StationCatReaderFeedback } from "@/lib/reader-feedback";
import { prisma } from "@/lib/prisma";

const readerFeedbackSnapshotRetentionLimit = 30;

export async function latestStationCatChapterRemoteId(
  projectId: string,
  chapterId: string,
) {
  const syncState = await prisma.publishSyncState.findFirst({
    where: {
      projectId,
      localType: "chapter",
      localId: chapterId,
      remoteId: {
        not: null,
      },
      target: {
        platformKey: "station_cat",
        status: "active",
      },
    },
    orderBy: [
      {
        lastSyncedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: {
      remoteId: true,
    },
  });

  return syncState?.remoteId?.trim() || null;
}

export async function saveChapterReaderFeedbackSnapshot({
  chapterId,
  feedback,
  projectId,
  remoteChapterId,
}: {
  chapterId: string;
  feedback: StationCatReaderFeedback;
  projectId: string;
  remoteChapterId: string;
}) {
  await prisma.$transaction(async (tx) => {
    const fetchedAt = new Date();

    await tx.chapterAnalytics.create({
      data: {
        projectId,
        chapterId,
        remoteChapterId,
        views: feedback.analytics.views,
        likes: feedback.analytics.likes,
        comments: feedback.analytics.comments,
        favorites: feedback.analytics.favorites,
        shares: feedback.analytics.shares,
        completionRate: feedback.analytics.completionRate,
        averageReadSeconds: feedback.analytics.averageReadSeconds,
        dropOffPoint: feedback.analytics.dropOffPoint,
        engagementScore: feedback.analytics.engagementScore,
        rawJson: feedback.analytics.rawJson,
        fetchedAt,
      },
    });

    await tx.chapterInsight.create({
      data: {
        projectId,
        chapterId,
        remoteChapterId,
        summary: feedback.insight.summary,
        pacing: feedback.insight.pacing,
        focus: feedback.insight.focus,
        hookStrategy: feedback.insight.hookStrategy,
        riskNotesJson: feedback.insight.riskNotesJson,
        characterPriorityJson: feedback.insight.characterPriorityJson,
        rawJson: feedback.insight.rawJson,
        fetchedAt,
      },
    });

    await tx.chapter.update({
      where: {
        id: chapterId,
      },
      data: {
        readerFeedbackUpdatedAt: fetchedAt,
      },
    });

    await pruneChapterReaderFeedbackSnapshots(tx, chapterId);
  });
}

async function pruneChapterReaderFeedbackSnapshots(
  tx: Prisma.TransactionClient,
  chapterId: string,
) {
  const staleAnalytics = await tx.chapterAnalytics.findMany({
    where: {
      chapterId,
    },
    orderBy: {
      fetchedAt: "desc",
    },
    skip: readerFeedbackSnapshotRetentionLimit,
    select: {
      id: true,
    },
  });

  if (staleAnalytics.length > 0) {
    await tx.chapterAnalytics.deleteMany({
      where: {
        id: {
          in: staleAnalytics.map((snapshot) => snapshot.id),
        },
      },
    });
  }

  const staleInsights = await tx.chapterInsight.findMany({
    where: {
      chapterId,
    },
    orderBy: {
      fetchedAt: "desc",
    },
    skip: readerFeedbackSnapshotRetentionLimit,
    select: {
      id: true,
    },
  });

  if (staleInsights.length > 0) {
    await tx.chapterInsight.deleteMany({
      where: {
        id: {
          in: staleInsights.map((snapshot) => snapshot.id),
        },
      },
    });
  }
}
