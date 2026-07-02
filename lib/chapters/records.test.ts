import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createChapterRecord,
  deleteChapterRecord,
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
});
