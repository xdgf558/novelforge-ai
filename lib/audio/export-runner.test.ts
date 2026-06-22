import { beforeEach, describe, expect, it, vi } from "vitest";
import { finalizeAudioExport, processAudioExport } from "./export-runner";

const mocks = vi.hoisted(() => ({
  getConfiguredTtsProvider: vi.fn(),
  writeAudioExportMetadata: vi.fn(),
  prisma: {
    audioExport: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    audioExportSegment: {
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("./audio-assets", async () => {
  const actual = await vi.importActual<typeof import("./audio-assets")>(
    "./audio-assets",
  );

  return {
    ...actual,
    writeAudioExportMetadata: mocks.writeAudioExportMetadata,
  };
});

vi.mock("./providers/registry", () => ({
  getConfiguredTtsProvider: mocks.getConfiguredTtsProvider,
}));

describe("processAudioExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writeAudioExportMetadata.mockResolvedValue("metadata.json");
    mocks.prisma.audioExport.update.mockResolvedValue({});
    mocks.prisma.audioExportSegment.updateMany.mockResolvedValue({
      count: 2,
    });
  });

  it("marks pending and running segments failed when the source text changed before processing", async () => {
    mocks.prisma.audioExport.findUnique
      .mockResolvedValueOnce({
        id: "audio_export_1",
        chapter: {
          draftText: "新的章节正文",
          finalText: "",
          polishedText: "",
          chapterNumber: 1,
          id: "chapter_1",
          title: "第一章",
        },
        createdAt: new Date("2026-06-22T00:00:00.000Z"),
        languageCode: "zh",
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3",
        projectId: "project_1",
        providerId: "ppq_tts",
        segments: [
          {
            charCount: 10,
            inputPreview: "旧分段一",
            localPath: null,
            segmentIndex: 1,
            status: "pending",
          },
          {
            charCount: 10,
            inputPreview: "旧分段二",
            localPath: null,
            segmentIndex: 2,
            status: "running",
          },
        ],
        sourceTextHash: "old_hash",
        sourceTextType: "draftText",
        totalSegments: 2,
        voiceId: "",
        voiceName: "",
      })
      .mockResolvedValueOnce({
        chapter: {
          chapterNumber: 1,
          id: "chapter_1",
          title: "第一章",
        },
        createdAt: new Date("2026-06-22T00:00:00.000Z"),
        id: "audio_export_1",
        languageCode: "zh",
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3",
        projectId: "project_1",
        providerId: "ppq_tts",
        segments: [
          {
            charCount: 10,
            inputPreview: "旧分段一",
            localPath: null,
            segmentIndex: 1,
            status: "failed",
          },
          {
            charCount: 10,
            inputPreview: "旧分段二",
            localPath: null,
            segmentIndex: 2,
            status: "failed",
          },
        ],
        sourceTextHash: "old_hash",
        sourceTextType: "draftText",
        voiceId: "",
        voiceName: "",
      });

    await processAudioExport({
      audioExportId: "audio_export_1",
    });

    expect(mocks.getConfiguredTtsProvider).not.toHaveBeenCalled();
    expect(mocks.prisma.audioExportSegment.updateMany).toHaveBeenCalledWith({
      where: {
        audioExportId: "audio_export_1",
        status: {
          in: ["pending", "running"],
        },
      },
      data: {
        errorMessage: "章节文本已变化，请创建新的有声导出任务。",
        status: "failed",
      },
    });
    expect(mocks.prisma.audioExport.update).toHaveBeenCalledWith({
      where: {
        id: "audio_export_1",
      },
      data: expect.objectContaining({
        errorMessage: "章节文本已变化，请创建新的有声导出任务。",
        failedSegments: 2,
        status: "failed",
        succeededSegments: 0,
      }),
    });
  });

  it("keeps segment-derived status when metadata writing fails", async () => {
    mocks.writeAudioExportMetadata.mockRejectedValue(new Error("disk full"));
    mocks.prisma.audioExport.findUnique.mockResolvedValue({
      chapter: {
        chapterNumber: 1,
        id: "chapter_1",
        title: "第一章",
      },
      createdAt: new Date("2026-06-22T00:00:00.000Z"),
      id: "audio_export_1",
      languageCode: "zh",
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3",
      projectId: "project_1",
      providerId: "ppq_tts",
      segments: [
        {
          charCount: 10,
          inputPreview: "分段一",
          localPath: "project_1/audio_export_1/001.mp3",
          segmentIndex: 1,
          status: "succeeded",
        },
      ],
      sourceTextHash: "source_hash",
      sourceTextType: "draftText",
      voiceId: "",
      voiceName: "",
    });

    await finalizeAudioExport("audio_export_1");

    expect(mocks.prisma.audioExport.update).toHaveBeenCalledWith({
      where: {
        id: "audio_export_1",
      },
      data: expect.objectContaining({
        errorMessage: "导出元数据写入失败：disk full",
        failedSegments: 0,
        status: "succeeded",
        succeededSegments: 1,
      }),
    });
  });
});
