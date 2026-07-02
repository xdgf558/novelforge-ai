import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildPreviousChapterEndingContext,
  findActiveOutlineGenerationTask,
  inferNextTargetChapterNumber,
} from "./ai-tasks";

const mocks = vi.hoisted(() => ({
  prisma: {
    aiTask: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("outline AI task helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
    });
  });

  it("finds active outline-generation tasks by the shared task type", async () => {
    await findActiveOutlineGenerationTask("project_1");

    expect(mocks.prisma.aiTask.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        taskType: "outline_generation",
        status: {
          in: ["pending", "running"],
        },
      },
      select: {
        id: true,
      },
    });
  });

  it("infers the next target chapter from existing chapters and chapter outlines", () => {
    expect(
      inferNextTargetChapterNumber(
        [
          {
            chapterNumber: 5,
          },
        ],
        [
          {
            level: "chapter",
            chapterNumber: 8,
          },
          {
            level: "unit",
            chapterNumber: 30,
          },
        ],
      ),
    ).toBe(9);
  });

  it("builds a bounded previous-chapter ending context from final text first", () => {
    const context = buildPreviousChapterEndingContext({
      chapterNumber: 2,
      title: "碎布暗隙",
      draftText: "draft",
      polishedText: "polished",
      finalText: `${"前文".repeat(1000)}结尾钩子`,
    });

    expect(context).toEqual({
      chapterNumber: 2,
      title: "碎布暗隙",
      endingText: expect.stringContaining("结尾钩子"),
    });
    expect(context?.endingText.length).toBeLessThanOrEqual(1800);
  });
});
