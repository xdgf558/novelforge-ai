import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adoptChapterPolish,
  updateChapter,
} from "./actions";

const mocks = vi.hoisted(() => {
  const tx = {
    chapter: {
      update: vi.fn(),
    },
    chapterVersion: {
      count: vi.fn(),
      create: vi.fn(),
    },
    aiTask: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    notFound: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    prisma: {
      project: {
        findUnique: vi.fn(),
      },
      chapter: {
        create: vi.fn(),
        delete: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      chapterVersion: {
        create: vi.fn(),
      },
      aiTask: {
        findFirst: vi.fn(),
      },
      outline: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    tx,
    createOpenAITextResponse: vi.fn(),
    markAiTaskCompleted: vi.fn(),
    markAiTaskFailed: vi.fn(),
    taskLogger: {
      createAiTask: vi.fn(),
      markAiTaskCompleted: vi.fn(),
      markAiTaskFailed: vi.fn(),
      markAiTaskRunning: vi.fn(),
      startLoggedOpenAITextTask: vi.fn(),
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/ai/openai-client", () => ({
  createOpenAITextResponse: mocks.createOpenAITextResponse,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  createAiTask: mocks.taskLogger.createAiTask,
  markAiTaskCompleted: mocks.markAiTaskCompleted,
  markAiTaskFailed: mocks.markAiTaskFailed,
  markAiTaskRunning: mocks.taskLogger.markAiTaskRunning,
  startLoggedOpenAITextTask: mocks.taskLogger.startLoggedOpenAITextTask,
}));

const baseChapter = {
  id: "chapter_1",
  projectId: "project_1",
  chapterNumber: 1,
  title: "第一章",
  status: "draft",
  goal: "章节目标",
  beats: "章节节拍",
  draftText: "旧草稿正文",
  polishedText: "作者手改精修稿",
  finalText: "旧定稿正文",
  notes: "作者备注",
  wordCount: 5,
  createdAt: new Date("2026-06-20T00:00:00.000Z"),
  updatedAt: new Date("2026-06-20T00:00:00.000Z"),
};

function buildChapterFormData(
  overrides: Partial<Record<string, string | number>> = {},
) {
  const values = {
    chapterNumber: 1,
    title: "第一章",
    status: "draft",
    goal: "章节目标",
    beats: "章节节拍",
    draftText: "草稿正文",
    polishedText: "精修正文",
    finalText: "",
    notes: "作者备注",
    changeReason: "",
    ...overrides,
  };
  const formData = new FormData();

  Object.entries(values).forEach(([name, value]) => {
    formData.set(name, String(value));
  });

  return formData;
}

describe("chapter actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.redirect.mockImplementation((url: string) => {
      const error = new Error("NEXT_REDIRECT");
      Object.assign(error, { url });
      throw error;
    });
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.tx.chapterVersion.count.mockResolvedValue(3);
    mocks.tx.chapterVersion.create.mockResolvedValue({});
    mocks.tx.chapter.update.mockResolvedValue({});
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.prisma.chapter.findMany.mockResolvedValue([]);
    mocks.prisma.outline.findMany.mockResolvedValue([]);
    mocks.prisma.outline.update.mockResolvedValue({});
    mocks.createOpenAITextResponse.mockReset();
    mocks.markAiTaskCompleted.mockReset();
    mocks.markAiTaskFailed.mockReset();
  });

  it("adopts a polish task into polishedText without touching finalText", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue(baseChapter);
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputText: "  AI 精修正文  ",
      adoptionState: "not_reviewed",
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "adopted",
      },
    });
    expect(mocks.tx.chapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "chapter_1",
        },
        data: expect.objectContaining({
          polishedText: "AI 精修正文",
          finalText: "旧定稿正文",
          status: "revising",
        }),
      }),
    );
    expect(mocks.tx.chapterVersion.create).toHaveBeenCalledTimes(1);
  });

  it("does not create another version when the polish task was already adopted", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue(baseChapter);
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputText: "AI 精修正文",
      adoptionState: "adopted",
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.chapter.update).not.toHaveBeenCalled();
    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
  });

  it("does not adopt excerpt-only polish tasks", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue(baseChapter);
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputJson: JSON.stringify({
        chapter: {
          sourceTextPromptWasExcerpted: true,
        },
      }),
      outputText: "这只是摘录精修预览。",
      adoptionState: "not_reviewed",
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/chapters/chapter_1?polishError=excerptedTaskCannotAdopt",
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.aiTask.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.chapter.update).not.toHaveBeenCalled();
    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
  });

  it("keeps polish adoption idempotent when the transaction loses the race", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue(baseChapter);
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputText: "AI 精修正文",
      adoptionState: "not_reviewed",
    });
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.chapter.update).not.toHaveBeenCalled();
    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
  });

  it("moves final chapters back to revising when adopting a new polish candidate", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      ...baseChapter,
      status: "final",
    });
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputText: "AI 新精修正文",
      adoptionState: "not_reviewed",
    });

    await expect(
      adoptChapterPolish("project_1", "chapter_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.chapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          polishedText: "AI 新精修正文",
          finalText: "旧定稿正文",
          status: "revising",
        }),
      }),
    );
  });

  it("finalizes from polished text and creates a chapter version", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      id: "chapter_1",
    });
    const formData = buildChapterFormData({
      submitIntent: "finalizeFromPolished",
      polishedText: "作者确认的精修正文",
    });

    await expect(updateChapter("project_1", "chapter_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.tx.chapter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          finalText: "作者确认的精修正文",
          status: "final",
        }),
      }),
    );
    expect(mocks.tx.chapterVersion.create).toHaveBeenCalledTimes(1);
  });

  it("rejects finalize-from-polished when polished text is empty", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      id: "chapter_1",
    });
    const formData = buildChapterFormData({
      submitIntent: "finalizeFromPolished",
      polishedText: "",
      draftText: "草稿正文",
    });

    await expect(updateChapter("project_1", "chapter_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/chapters/chapter_1/edit?finalizeError=missingPolishedText#polishedText",
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
  });

});
