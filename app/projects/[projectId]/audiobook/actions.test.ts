import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteAudioExport,
  retryFailedAudioExportSegments,
  startChapterAudioExport,
} from "./actions";

const mocks = vi.hoisted(() => ({
  processAudioExport: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    audioExport: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    audioExportSegment: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    chapter: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  readTtsGenerationSecrets: vi.fn(),
  deleteAudioExportAssets: vi.fn(),
  resolveWebsitePublishedAudioSource: vi.fn(),
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

vi.mock("@/lib/ai/local-config", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/local-config")>(
    "@/lib/ai/local-config",
  );

  return {
    ...actual,
    readTtsGenerationSecrets: mocks.readTtsGenerationSecrets,
  };
});

vi.mock("@/lib/audio/audio-assets", async () => {
  const actual = await vi.importActual<typeof import("@/lib/audio/audio-assets")>(
    "@/lib/audio/audio-assets",
  );

  return {
    ...actual,
    deleteAudioExportAssets: mocks.deleteAudioExportAssets,
  };
});

vi.mock("@/lib/audio/published-source", () => ({
  resolveWebsitePublishedAudioSource: mocks.resolveWebsitePublishedAudioSource,
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
    mocks.deleteAudioExportAssets.mockResolvedValue(undefined);
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
    mocks.prisma.audioExport.create.mockResolvedValue({
      id: "audio_export_1",
    });
    mocks.resolveWebsitePublishedAudioSource.mockResolvedValue({
      hash: "website-hash",
      remoteChapterId: "remote_chapter_1",
      remoteTitle: "第一章",
      remoteUpdatedAt: "2026-06-28T00:00:00.000Z",
      text: "网站正式公开正文",
      type: "publishedText",
    });
    mocks.prisma.audioExport.delete.mockResolvedValue({});
    mocks.prisma.audioExportSegment.createMany.mockResolvedValue({
      count: 1,
    });
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
      providerId: "ppq_tts",
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
      providerId: "ppq_tts",
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
    expect(mocks.prisma.audioExportSegment.updateMany).not.toHaveBeenCalled();
    expect(mocks.processAudioExport).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/audiobook?audioError=activeExport",
    );
  });

  it("does not retry failed segments from an old provider with current settings", async () => {
    mocks.readTtsGenerationSecrets.mockReturnValue({
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: "google-key",
      languageCode: "cmn",
      model: "gemini-2.5-flash-preview-tts",
      outputFormat: "wav",
      providerId: "google_tts",
      stylePrompt: "中文旁白",
      voiceId: "Kore",
      voiceName: "Kore - Firm",
    });
    mocks.prisma.audioExport.updateMany.mockResolvedValue({
      count: 0,
    });
    mocks.prisma.audioExport.findFirst.mockResolvedValue({
      id: "audio_export_1",
      providerId: "ppq_tts",
    });

    await expect(
      retryFailedAudioExportSegments("project_1", "audio_export_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.audioExportSegment.updateMany).not.toHaveBeenCalled();
    expect(mocks.processAudioExport).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/audiobook?audioError=legacyProviderExport",
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

  it("normalizes model id for the configured TTS provider before creating an export", async () => {
    const formData = buildAudioExportFormData();

    formData.set("modelId", "gemini-2.5-flash-preview-tts");
    mocks.readTtsGenerationSecrets.mockReturnValue({
      apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
      apiKey: "glm-key",
      languageCode: "zh",
      model: "glm-tts",
      outputFormat: "wav",
      providerId: "glm_tts",
      stylePrompt: "中文旁白",
      voiceId: "female",
      voiceName: "彤彤（默认）",
    });

    await expect(startChapterAudioExport("project_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.audioExport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        modelId: "glm-tts",
        providerId: "glm_tts",
      }),
    });
  });

  it("defaults missing source text type to the website published chapter content", async () => {
    const formData = buildAudioExportFormData();

    formData.delete("sourceTextType");

    await expect(startChapterAudioExport("project_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.resolveWebsitePublishedAudioSource).toHaveBeenCalledWith({
      chapterId: "chapter_1",
      projectId: "project_1",
    });
    expect(mocks.prisma.audioExport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceTextHash: "website-hash",
        sourceTextType: "publishedText",
        totalChars: "网站正式公开正文".length,
      }),
    });
  });

  it("deletes an audio export record and its local assets", async () => {
    mocks.prisma.audioExport.findFirst.mockResolvedValue({
      id: "audio_export_1",
      status: "succeeded",
    });

    await expect(
      deleteAudioExport("project_1", "audio_export_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.deleteAudioExportAssets).toHaveBeenCalledWith({
      audioExportId: "audio_export_1",
      projectId: "project_1",
    });
    expect(mocks.prisma.audioExport.delete).toHaveBeenCalledWith({
      where: {
        id: "audio_export_1",
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/audiobook?audioDeleted=1",
    );
  });

  it("does not delete a running audio export", async () => {
    mocks.prisma.audioExport.findFirst.mockResolvedValue({
      id: "audio_export_1",
      status: "running",
    });

    await expect(
      deleteAudioExport("project_1", "audio_export_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.deleteAudioExportAssets).not.toHaveBeenCalled();
    expect(mocks.prisma.audioExport.delete).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/audiobook?audioError=deleteActiveExport",
    );
  });
});
