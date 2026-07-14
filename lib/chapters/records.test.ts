import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import {
  createChapterRecord,
  deleteChapterRecord,
  DuplicateChapterNumberError,
  findChapterForUpdate,
  updateChapterRecord,
} from "./records";

const mocks = vi.hoisted(() => ({
  prisma: {
    chapter: {
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  tx: {
    chapter: {
      create: vi.fn(),
      update: vi.fn(),
    },
    chapterVersion: {
      count: vi.fn(),
      create: vi.fn(),
    },
    aiTask: {
      updateMany: vi.fn(),
    },
  },
  createMissingStorylineChapterRelationsForChapter: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/storyline-auto-relations", () => ({
  createMissingStorylineChapterRelationsForChapter:
    mocks.createMissingStorylineChapterRelationsForChapter,
}));

const baseValues = {
  chapterNumber: 7,
  title: "断供",
  status: "draft",
  goal: "章节目标",
  beats: "章节节拍",
  unitSceneMovement: "场景推进",
  unitConflict: "核心冲突",
  unitTurn: "关键转折",
  unitPayoffMovement: "兑现推进",
  unitWordTarget: 5000,
  draftText: "草稿正文",
  polishedText: "",
  finalText: "",
  notes: "作者备注",
  wordCount: 0,
};

describe("chapter record services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.tx.chapter.create.mockResolvedValue({
      id: "chapter_7",
      chapterNumber: 7,
    });
    mocks.tx.chapterVersion.count.mockResolvedValue(2);
    mocks.tx.chapterVersion.create.mockResolvedValue({});
    mocks.tx.aiTask.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.chapter.update.mockResolvedValue({});
    mocks.createMissingStorylineChapterRelationsForChapter.mockResolvedValue(
      undefined,
    );
  });

  it("creates a chapter with an initial version and range-based storyline sync", async () => {
    const result = await createChapterRecord({
      projectId: "project_1",
      values: baseValues,
      changeReason: "manual create",
    });

    expect(result.chapter.id).toBe("chapter_7");
    expect(result.chapterNumber).toBe(7);
    expect(mocks.tx.chapter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        chapterNumber: 7,
        title: "断供",
      }),
    });
    expect(mocks.tx.chapterVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        chapterId: "chapter_7",
        versionNumber: 1,
        changeReason: "manual create",
        sourceType: "manual",
      }),
    });
    expect(
      mocks.createMissingStorylineChapterRelationsForChapter,
    ).toHaveBeenCalledWith(
      mocks.tx,
      "project_1",
      expect.objectContaining({
        id: "chapter_7",
        chapterNumber: 7,
      }),
    );
  });

  it("updates an existing chapter with the next version number", async () => {
    const chapter = {
      id: "chapter_7",
      chapterNumber: 6,
    };

    const result = await updateChapterRecord({
      projectId: "project_1",
      chapter,
      values: baseValues,
      changeReason: "manual update",
    });

    expect(result).toEqual({
      chapterId: "chapter_7",
      previousChapterNumber: 6,
      chapterNumber: 7,
    });
    expect(mocks.tx.chapter.update).toHaveBeenCalledWith({
      where: {
        id: "chapter_7",
      },
      data: expect.objectContaining({
        chapterNumber: 7,
        title: "断供",
      }),
    });
    expect(mocks.tx.chapterVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        chapterId: "chapter_7",
        versionNumber: 3,
        changeReason: "manual update",
        sourceType: "manual",
      }),
    });
  });

  it("adopts a reviewed AI unit plan atomically with the new writing unit", async () => {
    await createChapterRecord({
      projectId: "project_1",
      values: baseValues,
      changeReason: "采用 AI 单元规划草案并创建写作单元",
      sourceAiTask: {
        id: "unit_plan_task_1",
        taskType: "short_story_unit_plan_generation",
        sourceType: "ai_short_story_unit_plan",
      },
    });

    expect(mocks.tx.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        id: "unit_plan_task_1",
        projectId: "project_1",
        taskType: "short_story_unit_plan_generation",
        status: "completed",
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "adopted",
        chapterId: "chapter_7",
      },
    });
    expect(mocks.tx.chapterVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceType: "ai_short_story_unit_plan",
      }),
    });
  });

  it("finds an existing chapter before parsing update form data", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      id: "chapter_7",
      chapterNumber: 6,
    });

    await expect(
      findChapterForUpdate({
        projectId: "project_1",
        chapterId: "chapter_7",
      }),
    ).resolves.toEqual({
      id: "chapter_7",
      chapterNumber: 6,
    });

    expect(mocks.prisma.chapter.findFirst).toHaveBeenCalledWith({
      where: {
        id: "chapter_7",
        projectId: "project_1",
      },
      select: {
        id: true,
        chapterNumber: true,
      },
    });
  });

  it("returns null instead of deleting a missing chapter", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue(null);

    await expect(
      deleteChapterRecord({
        projectId: "project_1",
        chapterId: "missing",
      }),
    ).resolves.toBeNull();

    expect(mocks.prisma.chapter.delete).not.toHaveBeenCalled();
  });

  it("maps the database unique constraint to a chapter-number error", async () => {
    mocks.prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
        meta: {
          target: ["projectId", "chapterNumber"],
        },
      }),
    );

    await expect(
      createChapterRecord({
        projectId: "project_1",
        values: baseValues,
      }),
    ).rejects.toBeInstanceOf(DuplicateChapterNumberError);
  });

  it("does not mislabel an unrelated unique constraint as a chapter-number error", async () => {
    const databaseError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.19.3",
        meta: {
          target: ["storylineId", "chapterId"],
        },
      },
    );
    mocks.prisma.$transaction.mockRejectedValueOnce(databaseError);

    await expect(
      updateChapterRecord({
        projectId: "project_1",
        chapter: {
          id: "chapter_7",
          chapterNumber: 6,
        },
        values: baseValues,
      }),
    ).rejects.toBe(databaseError);
  });
});
