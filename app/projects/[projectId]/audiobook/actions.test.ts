import { beforeEach, describe, expect, it, vi } from "vitest";
import { startChapterAudioExport } from "./actions";

const mocks = vi.hoisted(() => ({
  processAudioExport: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    audioExport: {
      findFirst: vi.fn(),
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
});
