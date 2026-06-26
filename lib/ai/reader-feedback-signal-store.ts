import { prisma } from "@/lib/prisma";
import {
  buildReaderFeedbackSignals,
  type ReaderFeedbackSignal,
} from "./reader-feedback-context";

const generationReaderFeedbackChapterLimit = 3;

export async function loadReaderFeedbackSignalsForChapterGeneration({
  beforeChapterNumber,
  projectId,
}: {
  beforeChapterNumber: number;
  projectId: string;
}): Promise<ReaderFeedbackSignal[]> {
  const chapters = await prisma.chapter.findMany({
    where: {
      projectId,
      chapterNumber: {
        lt: beforeChapterNumber,
      },
      OR: [
        {
          readerAnalytics: {
            some: {},
          },
        },
        {
          readerInsights: {
            some: {},
          },
        },
      ],
    },
    orderBy: {
      chapterNumber: "desc",
    },
    take: generationReaderFeedbackChapterLimit,
    select: {
      chapterNumber: true,
      title: true,
      readerAnalytics: {
        orderBy: {
          fetchedAt: "desc",
        },
        take: 1,
        select: {
          fetchedAt: true,
          views: true,
          likes: true,
          comments: true,
          favorites: true,
          shares: true,
          completionRate: true,
          averageReadSeconds: true,
          dropOffPoint: true,
          engagementScore: true,
        },
      },
      readerInsights: {
        orderBy: {
          fetchedAt: "desc",
        },
        take: 1,
        select: {
          fetchedAt: true,
          summary: true,
          pacing: true,
          focus: true,
          hookStrategy: true,
          riskNotesJson: true,
          characterPriorityJson: true,
        },
      },
    },
  });

  return buildReaderFeedbackSignals(chapters.reverse());
}
