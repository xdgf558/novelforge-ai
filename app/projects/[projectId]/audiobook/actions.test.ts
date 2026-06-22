import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  retryFailedAudioExportSegments,
  startChapterAudioExport,
} from "./actions";

const mocks = vi.hoisted(() => ({
  processAudioExport: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    audioExport: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    audioExportSegment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    chapter: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  readTtsGenerationSecrets: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: mocks.redirect,
}));

vi.mock("@/lib/ai/local-config", () => ({
  readTtsGenerationSecrets: mocks.readTtsGenerationSecrets,
}));

vi.mock("@/lib/audio/export-runner", () => ({
  processAudioExport: mocks.processAudioExport,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

function buildAudioExportFormData() {
  const formData = new FormData();

  formData.set("chapterId", "chapter_1");
  formData.set("languageCode", "zh");
  formData.set("modelId", "eleven_multilingual_v2");
  formData.set("outputFormat", "mp3");
  formData.set("sourceTextType", "auto");
  formData.set("stylePrompt", "中文旁白");
  formData.set("voiceId", "voice_1");
  formData.set("voiceName", "Narrator");

  return formData;
}

describe("audiobook actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.processAudioExport.mockResolvedValue(undefined);
    mocks.redirect.mockImplementation((url: string) => {
      const error = new Error("NEXT_REDIRECT");
      Object.assign(error, { url });
      throw error;
    });
    mocks.readTtsGenerationSecrets.mockReturnValue({
      apiBaseUrl: "https://api.ppq.ai/v1",
      apiKey: "ppq-key",
      languageCode: "zh",
      model: "eleven_multilingual_v2",
      outputFormat: "mp3",
      providerId: "ppq_tts",
      stylePrompt: "中文旁白",
      voiceId: "voice_1",
      voiceName: "Narrator",
    });
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      id: "chapter_1",
      draftText: "草稿正文",
      finalText: "",
      polishedText: "",
      title: "第一章",
    });
    mocks.prisma.audioExport.findFirst.mockResolvedValue(null);
    mocks.prisma.audioExport.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.prisma.audioExportSegment.findMany.mockResolvedValue([
      {
        id: "segment_1",
        segmentIndex: 1,
      },
    ]);
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.prisma),
    );
  });

  it("does not create another export when the chapter already has an active export", async () => {
    mocks.prisma.audioExport.findFirst.mockResolvedValue({
      id: "audio_export_1",
    });

    await expect(
      startChapterAudioExport("project_1", buildAudioExportFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.audioExport.findFirst).toHaveBeenCalledWith({
      where: {
        chapterId: "chapter_1",
        projectId: "project_1",
        status: {
          in: ["pending", "running"],
        },
      },
      select: {
        id: true,
      },
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.processAudioExport).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/audiobook?audioError=activeExport",
    );
  });

  it("turns an active export unique constraint into a friendly redirect", async () => {
    mocks.prisma.$transaction.mockRejectedValueOnce({
      code: "P2002",
    });

    await expect(
      startChapterAudioExport("project_1", buildAudioExportFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.processAudioExport).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/audiobook?audioError=activeExport",
    );
  });

  it("locks retry so a second request does not start duplicate TTS work", async () => {
    mocks.prisma.audioExport.updateMany.mockResolvedValue({
      count: 0,
    });
    mocks.prisma.audioExport.findFirst.mockResolvedValue({
      id: "audio_export_1",
    });

    await expect(
      retryFailedAudioExportSegments("project_1", "audio_export_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.audioExport.updateMany).toHaveBeenCalledWith({
      where: {
        failedSegments: {
          gt: 0,
        },
        id: "audio_export_1",
        projectId: "project_1",
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
    expect(mocks.prisma.audioExportSegment.updateMany).not.toHaveBeenCalled();
    expect(mocks.processAudioExport).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/audiobook?audioError=activeExport",
    );
  });

  it("starts retry only for failed segments after acquiring the export lock", async () => {
    await expect(
      retryFailedAudioExportSegments("project_1", "audio_export_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.audioExportSegment.updateMany).toHaveBeenCalledWith({
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
    expect(mocks.processAudioExport).toHaveBeenCalledWith({
      audioExportId: "audio_export_1",
      segmentIndexes: [1],
    });
  });
});
