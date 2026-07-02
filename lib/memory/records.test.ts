import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  archiveWorldRuleRecord,
  chapterReferencesBelongToProject,
  createForeshadowRecord,
} from "./records";

const mocks = vi.hoisted(() => ({
  prisma: {
    chapter: {
      count: vi.fn(),
    },
    foreshadow: {
      create: vi.fn(),
    },
    worldRule: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("memory record services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.chapter.count.mockResolvedValue(1);
    mocks.prisma.foreshadow.create.mockResolvedValue({
      id: "foreshadow_1",
    });
    mocks.prisma.worldRule.update.mockResolvedValue({
      id: "rule_1",
      status: "archived",
    });
  });

  it("skips chapter lookup when no chapter references are present", async () => {
    await expect(
      chapterReferencesBelongToProject({
        ids: [null, undefined, ""],
        projectId: "project_1",
      }),
    ).resolves.toBe(true);

    expect(mocks.prisma.chapter.count).not.toHaveBeenCalled();
  });

  it("detects cross-project chapter references before formal memory writes", async () => {
    mocks.prisma.chapter.count.mockResolvedValue(1);

    await expect(
      chapterReferencesBelongToProject({
        ids: ["chapter_1", "chapter_other"],
        projectId: "project_1",
      }),
    ).resolves.toBe(false);

    expect(mocks.prisma.chapter.count).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        id: {
          in: ["chapter_1", "chapter_other"],
        },
      },
    });
  });

  it("creates foreshadow records with project ownership", async () => {
    await createForeshadowRecord({
      projectId: "project_1",
      values: {
        content: "玉印缺角后续需要回收。",
        status: "planted",
        importance: "high",
        expectedResolveChapter: 12,
        relatedCharacters: "沈照夜",
        relatedLocations: "",
        relatedFactions: "",
        plantedChapterId: "chapter_1",
        resolvedChapterId: null,
        sourceChapterId: "chapter_1",
      },
    });

    expect(mocks.prisma.foreshadow.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        content: "玉印缺角后续需要回收。",
        plantedChapterId: "chapter_1",
      }),
    });
  });

  it("archives world rules instead of deleting formal memory", async () => {
    await archiveWorldRuleRecord("rule_1");

    expect(mocks.prisma.worldRule.update).toHaveBeenCalledWith({
      where: {
        id: "rule_1",
      },
      data: {
        status: "archived",
      },
    });
  });
});
