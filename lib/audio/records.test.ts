import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createChapterAudioExportRecord,
  lockFailedAudioExportSegmentsForRetry,
} from "./records";

const mocks = vi.hoisted(() => {
  const tx = {
    audioExport: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    audioExportSegment: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn(),
    },
    tx,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("audio record services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.tx.audioExport.create.mockResolvedValue({
      id: "audio_export_1",
    });
    mocks.tx.audioExportSegment.createMany.mockResolvedValue({
      count: 2,
    });
    mocks.tx.audioExport.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.tx.audioExportSegment.findMany.mockResolvedValue([
      {
        id: "segment_1",
        segmentIndex: 1,
      },
    ]);
    mocks.tx.audioExportSegment.updateMany.mockResolvedValue({
      count: 1,
    });
  });

  it("creates an audio export and segment records in one transaction", async () => {
    await createChapterAudioExportRecord({
      chapter: {
        chapterNumber: 3,
        id: "chapter_3",
        title: "墙痕对质",
      },
      chunks: [
        {
          charCount: 4,
          index: 1,
          preview: "第一段",
          text: "第一段正文",
        },
        {
          charCount: 4,
          index: 2,
          preview: "第二段",
          text: "第二段正文",
        },
      ],
      languageCode: "zh",
      modelId: "eleven_multilingual_v2",
      outputFormat: "wav",
      projectId: "project_1",
      providerId: "ppq_tts",
      sourceText: {
        hash: "source_hash",
        remoteChapterId: "remote_3",
        remoteUpdatedAt: "2026-07-01T00:00:00.000Z",
        text: "第一段正文\n第二段正文",
        type: "publishedText",
      },
      stylePrompt: "沉稳旁白",
      voiceId: "voice_1",
      voiceName: "Narrator",
    });

    expect(mocks.tx.audioExport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        chapterId: "chapter_3",
        languageCode: "zh",
        metadataJson: expect.stringContaining("\"remoteChapterId\":\"remote_3\""),
        outputFormat: "wav",
        projectId: "project_1",
        providerId: "ppq_tts",
        sourceTextHash: "source_hash",
        sourceTextType: "publishedText",
        status: "running",
        totalSegments: 2,
      }),
    });
    expect(mocks.tx.audioExportSegment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          audioExportId: "audio_export_1",
          chapterId: "chapter_3",
          projectId: "project_1",
          segmentIndex: 1,
          status: "pending",
        }),
        expect.objectContaining({
          audioExportId: "audio_export_1",
          segmentIndex: 2,
        }),
      ],
    });
  });

  it("locks failed segments for retry and returns the segment indexes", async () => {
    await expect(
      lockFailedAudioExportSegmentsForRetry({
        audioExportId: "audio_export_1",
        projectId: "project_1",
        providerId: "ppq_tts",
      }),
    ).resolves.toEqual({
      locked: true,
      segmentIndexes: [1],
    });

    expect(mocks.tx.audioExport.updateMany).toHaveBeenCalledWith({
      where: {
        failedSegments: {
          gt: 0,
        },
        id: "audio_export_1",
        projectId: "project_1",
        providerId: "ppq_tts",
        status: {
          in: ["failed", "partial_success"],
        },
      },
      data: {
        completedAt: null,
        errorMessage: null,
        status: "running",
      },
    });
    expect(mocks.tx.audioExportSegment.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["segment_1"],
        },
        status: "failed",
      },
      data: {
        errorMessage: null,
        status: "pending",
      },
    });
  });
});
