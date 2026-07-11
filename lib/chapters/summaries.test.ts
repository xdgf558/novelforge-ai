import { beforeEach, describe, expect, it, vi } from "vitest";
import { chapterFinalTextHash } from "./source-text";

const mocks = vi.hoisted(() => ({
  prisma: {
    chapter: {
      findMany: vi.fn(),
    },
    chapterSummary: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import {
  findCurrentChapterSummary,
  findRecentCurrentChapterSummaries,
  persistChapterSummaryFromTask,
} from "./summaries";

describe("durable chapter summaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists a completed summary independently from its AI task log", async () => {
    mocks.prisma.chapterSummary.upsert.mockResolvedValue({ id: "summary_1" });

    await persistChapterSummaryFromTask({
      projectId: "project_1",
      chapterId: "chapter_1",
      sourceTextHash: "hash_1",
      task: {
        id: "task_1",
        model: "deepseek-v4-pro",
        inputContextSummary: "第 1 章摘要",
        outputText: "  摘要内容  ",
      },
    });

    expect(mocks.prisma.chapterSummary.upsert).toHaveBeenCalledWith({
      where: {
        aiTaskId: "task_1",
      },
      create: expect.objectContaining({
        projectId: "project_1",
        chapterId: "chapter_1",
        aiTaskId: "task_1",
        outputText: "摘要内容",
        sourceTextHash: "hash_1",
      }),
      update: expect.objectContaining({
        outputText: "摘要内容",
        sourceTextHash: "hash_1",
      }),
    });
  });

  it("loads only a summary produced from the current final text", async () => {
    mocks.prisma.chapterSummary.findFirst.mockResolvedValue({ id: "summary_1" });

    await findCurrentChapterSummary({
      projectId: "project_1",
      chapterId: "chapter_1",
      finalText: "当前定稿",
    });

    expect(mocks.prisma.chapterSummary.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "project_1",
          chapterId: "chapter_1",
          sourceTextHash: chapterFinalTextHash("当前定稿"),
        },
      }),
    );
  });

  it("returns one current summary per chapter without hiding older chapters", async () => {
    const firstHash = chapterFinalTextHash("第一章定稿");
    const secondHash = chapterFinalTextHash("第二章定稿");
    const createdAt = new Date("2026-07-11T00:00:00.000Z");

    mocks.prisma.chapter.findMany.mockResolvedValue([
      { id: "chapter_2", finalText: "第二章定稿" },
      { id: "chapter_1", finalText: "第一章定稿" },
    ]);
    mocks.prisma.chapterSummary.findMany.mockResolvedValue([
      {
        id: "summary_2_stale",
        chapterId: "chapter_2",
        inputContextSummary: "第二章过期摘要",
        outputText: "第二章过期摘要内容",
        sourceTextHash: chapterFinalTextHash("第二章旧定稿"),
        createdAt,
      },
      {
        id: "summary_2_latest",
        chapterId: "chapter_2",
        inputContextSummary: "第二章新摘要",
        outputText: "第二章新摘要内容",
        sourceTextHash: secondHash,
        createdAt,
      },
      {
        id: "summary_2_older",
        chapterId: "chapter_2",
        inputContextSummary: "第二章旧摘要",
        outputText: "第二章旧摘要内容",
        sourceTextHash: secondHash,
        createdAt,
      },
      {
        id: "summary_1",
        chapterId: "chapter_1",
        inputContextSummary: "第一章摘要",
        outputText: "第一章摘要内容",
        sourceTextHash: firstHash,
        createdAt,
      },
    ]);

    await expect(
      findRecentCurrentChapterSummaries({ projectId: "project_1", limit: 2 }),
    ).resolves.toEqual([
      expect.objectContaining({ id: "summary_2_latest" }),
      expect.objectContaining({ id: "summary_1" }),
    ]);
    expect(mocks.prisma.chapter.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ take: expect.anything() }),
    );
    expect(mocks.prisma.chapterSummary.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "project_1",
        },
      }),
    );
  });
});
