import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeStorylineRecord,
  createStorylineRecord,
  validateStorylineRelationIds,
} from "./records";

const mocks = vi.hoisted(() => {
  const tx = {
    chapter: {
      findMany: vi.fn(),
    },
    storyline: {
      create: vi.fn(),
    },
    storylineCharacter: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    storylineForeshadow: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    storylineChapter: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    storylineOutline: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  return {
    prisma: {
      character: {
        count: vi.fn(),
      },
      foreshadow: {
        count: vi.fn(),
      },
      chapter: {
        count: vi.fn(),
      },
      outline: {
        count: vi.fn(),
      },
      storyline: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    tx,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

const baseValues = {
  name: "沈裴联手翻案主线",
  type: "mainline",
  status: "active",
  startChapter: 3,
  endChapter: 5,
  coreGoal: "让沈裴从对峙转向合作。",
  currentProgress: "",
  notes: "",
};

describe("storyline record services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.tx.storyline.create.mockResolvedValue({
      id: "storyline_1",
    });
    mocks.tx.chapter.findMany.mockResolvedValue([
      {
        id: "chapter_3",
      },
      {
        id: "chapter_4",
      },
    ]);
    mocks.tx.storylineCharacter.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineForeshadow.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineChapter.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineOutline.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineCharacter.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.storylineForeshadow.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.storylineChapter.createMany.mockResolvedValue({ count: 2 });
    mocks.tx.storylineOutline.createMany.mockResolvedValue({ count: 1 });
    mocks.prisma.character.count.mockResolvedValue(1);
    mocks.prisma.foreshadow.count.mockResolvedValue(1);
    mocks.prisma.chapter.count.mockResolvedValue(1);
    mocks.prisma.outline.count.mockResolvedValue(1);
    mocks.prisma.storyline.updateMany.mockResolvedValue({ count: 1 });
  });

  it("creates a storyline and merges explicit range chapters into chapter relations", async () => {
    await createStorylineRecord({
      projectId: "project_1",
      values: baseValues,
      relationIds: {
        characterIds: ["character_1"],
        foreshadowIds: [],
        chapterIds: ["chapter_manual"],
        outlineIds: [],
      },
    });

    expect(mocks.tx.storyline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "沈裴联手翻案主线",
        type: "mainline",
        status: "active",
        startChapter: 3,
        endChapter: 5,
      }),
      select: {
        id: true,
      },
    });
    expect(mocks.tx.chapter.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        chapterNumber: {
          gte: 3,
          lte: 5,
        },
      },
      orderBy: {
        chapterNumber: "asc",
      },
      select: {
        id: true,
      },
    });
    expect(mocks.tx.storylineChapter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          chapterId: "chapter_manual",
        },
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          chapterId: "chapter_3",
        },
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          chapterId: "chapter_4",
        },
      ],
    });
  });

  it("validates all relation ids against the current project", async () => {
    await expect(
      validateStorylineRelationIds("project_1", {
        characterIds: ["character_1"],
        foreshadowIds: ["foreshadow_1"],
        chapterIds: ["chapter_1"],
        outlineIds: ["outline_1"],
      }),
    ).resolves.toBeNull();

    expect(mocks.prisma.character.count).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        id: {
          in: ["character_1"],
        },
      },
    });
  });

  it("reports invalid relations when any project-scoped count does not match", async () => {
    mocks.prisma.foreshadow.count.mockResolvedValue(0);

    await expect(
      validateStorylineRelationIds("project_1", {
        characterIds: ["character_1"],
        foreshadowIds: ["foreshadow_other"],
        chapterIds: [],
        outlineIds: [],
      }),
    ).resolves.toBe("invalidRelation");
  });

  it("returns whether a completion actually changed the storyline", async () => {
    await expect(
      completeStorylineRecord({
        projectId: "project_1",
        storylineId: "storyline_1",
      }),
    ).resolves.toBe("completed");

    mocks.prisma.storyline.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      completeStorylineRecord({
        projectId: "project_1",
        storylineId: "storyline_1",
      }),
    ).resolves.toBe("already-updated");
  });
});
