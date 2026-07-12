import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    outline: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    chapter: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import { syncOutlineStatusesForChapterNumbers } from "./outline-status";

describe("outline status synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.outline.update.mockResolvedValue({});
  });

  it("marks a stale unit completed after all chapters are confirmed", async () => {
    mocks.prisma.outline.findMany.mockResolvedValue([
      {
        id: "unit_1",
        level: "unit",
        status: "active",
        startChapter: 1,
        endChapter: 2,
      },
    ]);
    mocks.prisma.chapter.findMany.mockResolvedValue([
      { chapterNumber: 1, status: "final" },
      { chapterNumber: 2, status: "published" },
    ]);

    await syncOutlineStatusesForChapterNumbers("project_1", [2]);

    expect(mocks.prisma.outline.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        status: {
          not: "archived",
        },
      },
    });
    expect(mocks.prisma.outline.update).toHaveBeenCalledWith({
      where: {
        id: "unit_1",
      },
      data: {
        status: "completed",
      },
    });
  });

  it("avoids database work for an empty chapter-number set", async () => {
    await syncOutlineStatusesForChapterNumbers("project_1", []);

    expect(mocks.prisma.outline.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.chapter.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.outline.update).not.toHaveBeenCalled();
  });
});
