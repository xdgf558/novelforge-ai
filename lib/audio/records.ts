import { Prisma } from "@prisma/client";

import {
  estimateAudioDurationSeconds,
  estimateTtsCostCents,
  modelInputLimit,
} from "@/lib/audio/estimate-cost";
import { hashAudioSourceText } from "@/lib/audio/text-source";
import { prisma } from "@/lib/prisma";

type AudioChunkForRecord = {
  charCount: number;
  index: number;
  preview: string;
  text: string;
};

type AudioSourceForRecord = {
  hash: string;
  text: string;
  type: string;
  remoteChapterId?: string | null;
  remoteUpdatedAt?: string | null;
};

type ChapterForAudioExport = {
  chapterNumber: number;
  id: string;
  title: string;
};

export function isActiveAudioExportStatus(status: string) {
  return status === "pending" || status === "running";
}

export function isUniqueConstraintError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function findChapterForAudioExport({
  chapterId,
  projectId,
}: {
  chapterId: string;
  projectId: string;
}) {
  return prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
  });
}

export async function findActiveChapterAudioExport({
  chapterId,
  projectId,
}: {
  chapterId: string;
  projectId: string;
}) {
  return prisma.audioExport.findFirst({
    where: {
      chapterId,
      projectId,
      status: {
        in: ["pending", "running"],
      },
    },
    select: {
      id: true,
    },
  });
}

export async function createChapterAudioExportRecord({
  chapter,
  chunks,
  languageCode,
  modelId,
  outputFormat,
  projectId,
  providerId,
  sourceText,
  stylePrompt,
  voiceId,
  voiceName,
}: {
  chapter: ChapterForAudioExport;
  chunks: AudioChunkForRecord[];
  languageCode: string;
  modelId: string;
  outputFormat: string;
  projectId: string;
  providerId: string;
  sourceText: AudioSourceForRecord;
  stylePrompt: string;
  voiceId: string;
  voiceName: string;
}) {
  return prisma.$transaction(async (tx) => {
    const createdExport = await tx.audioExport.create({
      data: {
        chapterId: chapter.id,
        estimatedCostCents: estimateTtsCostCents({
          charCount: sourceText.text.length,
          modelId,
        }),
        estimatedSeconds: estimateAudioDurationSeconds(sourceText.text.length),
        failedSegments: 0,
        languageCode,
        metadataJson: JSON.stringify({
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.title,
          modelInputLimit: modelInputLimit(modelId),
          remoteChapterId: sourceText.remoteChapterId ?? null,
          remoteUpdatedAt: sourceText.remoteUpdatedAt ?? null,
        }),
        modelId,
        outputFormat,
        projectId,
        providerId,
        scope: "chapter",
        sourceTextHash: sourceText.hash,
        sourceTextType: sourceText.type,
        status: "running",
        stylePrompt,
        succeededSegments: 0,
        totalChars: sourceText.text.length,
        totalSegments: chunks.length,
        voiceId,
        voiceName,
      },
    });

    await tx.audioExportSegment.createMany({
      data: chunks.map((chunk) => ({
        audioExportId: createdExport.id,
        chapterId: chapter.id,
        charCount: chunk.charCount,
        inputPreview: chunk.preview,
        projectId,
        segmentIndex: chunk.index,
        status: "pending",
        textHash: hashAudioSourceText(chunk.text),
      })),
    });

    return createdExport;
  });
}

export async function lockFailedAudioExportSegmentsForRetry({
  audioExportId,
  projectId,
  providerId,
}: {
  audioExportId: string;
  projectId: string;
  providerId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.audioExport.updateMany({
      where: {
        failedSegments: {
          gt: 0,
        },
        id: audioExportId,
        projectId,
        status: {
          in: ["failed", "partial_success"],
        },
        providerId,
      },
      data: {
        completedAt: null,
        errorMessage: null,
        status: "running",
      },
    });

    if (locked.count !== 1) {
      return {
        locked: false,
        segmentIndexes: [] as number[],
      };
    }

    const failedSegments = await tx.audioExportSegment.findMany({
      where: {
        audioExportId,
        projectId,
        status: "failed",
      },
      select: {
        id: true,
        segmentIndex: true,
      },
    });

    if (failedSegments.length === 0) {
      await tx.audioExport.update({
        where: {
          id: audioExportId,
        },
        data: {
          completedAt: new Date(),
          errorMessage: "没有可重试的失败分段。",
          failedSegments: 0,
          status: "failed",
        },
      });

      return {
        locked: true,
        segmentIndexes: [] as number[],
      };
    }

    await tx.audioExportSegment.updateMany({
      where: {
        id: {
          in: failedSegments.map((segment) => segment.id),
        },
        status: "failed",
      },
      data: {
        errorMessage: null,
        status: "pending",
      },
    });

    return {
      locked: true,
      segmentIndexes: failedSegments.map((segment) => segment.segmentIndex),
    };
  });
}

export async function findAudioExportProvider({
  audioExportId,
  projectId,
}: {
  audioExportId: string;
  projectId: string;
}) {
  return prisma.audioExport.findFirst({
    where: {
      id: audioExportId,
      projectId,
    },
    select: {
      id: true,
      providerId: true,
    },
  });
}

export async function findAudioExportFolderRecord({
  audioExportId,
  projectId,
}: {
  audioExportId: string;
  projectId: string;
}) {
  return prisma.audioExport.findFirst({
    where: {
      id: audioExportId,
      projectId,
    },
    select: {
      id: true,
      outputDirectory: true,
    },
  });
}

export async function findAudioExportForDeletion({
  audioExportId,
  projectId,
}: {
  audioExportId: string;
  projectId: string;
}) {
  return prisma.audioExport.findFirst({
    where: {
      id: audioExportId,
      projectId,
    },
    select: {
      id: true,
      status: true,
    },
  });
}

export async function deleteAudioExportRecord(audioExportId: string) {
  return prisma.audioExport.delete({
    where: {
      id: audioExportId,
    },
  });
}
