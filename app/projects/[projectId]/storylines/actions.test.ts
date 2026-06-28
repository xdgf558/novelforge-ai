import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStoryline } from "./actions";

const mocks = vi.hoisted(() => {
  const tx = {
    storyline: {
      create: vi.fn(),
      update: vi.fn(),
    },
    storylineCharacter: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    storylineForeshadow: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    storylineChapter: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    storylineOutline: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
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
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    tx,
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

function formData(values: Record<string, string | number | string[]>) {
  const data = new FormData();

  Object.entries(values).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => data.append(name, item));
    } else {
      data.set(name, String(value));
    }
  });

  return data;
}

describe("storyline actions", () => {
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
    mocks.prisma.project.findUnique.mockResolvedValue({
      id: "project_1",
    });
    mocks.prisma.character.count.mockResolvedValue(1);
    mocks.prisma.foreshadow.count.mockResolvedValue(1);
    mocks.prisma.chapter.count.mockResolvedValue(1);
    mocks.prisma.outline.count.mockResolvedValue(1);
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.tx.storyline.create.mockResolvedValue({
      id: "storyline_1",
    });
    mocks.tx.storylineCharacter.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineForeshadow.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineChapter.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineOutline.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.storylineCharacter.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.storylineForeshadow.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.storylineChapter.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.storylineOutline.createMany.mockResolvedValue({ count: 1 });
  });

  it("creates a formal storyline and project-scoped relations", async () => {
    await expect(
      createStoryline(
        "project_1",
        formData({
          name: "罗文斌反派线",
          type: "antagonist_line",
          status: "active",
          startChapter: 2,
          endChapter: 12,
          coreGoal: "让罗文斌从本地试探升级为渠道正面冲突。",
          currentProgress: "已经完成培训班施压和坏道试探。",
          characterIds: ["character_1"],
          foreshadowIds: ["foreshadow_1"],
          chapterIds: ["chapter_2"],
          outlineIds: ["outline_1"],
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.storyline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "罗文斌反派线",
        type: "antagonist_line",
        status: "active",
        startChapter: 2,
        endChapter: 12,
      }),
      select: {
        id: true,
      },
    });
    expect(mocks.tx.storylineCharacter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          characterId: "character_1",
        },
      ],
    });
    expect(mocks.tx.storylineForeshadow.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          foreshadowId: "foreshadow_1",
        },
      ],
    });
    expect(mocks.tx.storylineChapter.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          chapterId: "chapter_2",
        },
      ],
    });
    expect(mocks.tx.storylineOutline.createMany).toHaveBeenCalledWith({
      data: [
        {
          projectId: "project_1",
          storylineId: "storyline_1",
          outlineId: "outline_1",
        },
      ],
    });
  });

  it("rejects invalid chapter ranges before writing", async () => {
    await expect(
      createStoryline(
        "project_1",
        formData({
          name: "倒置范围",
          startChapter: 10,
          endChapter: 3,
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines?storylineError=invalidRange#storylines",
    );
  });

  it("rejects cross-project relation ids before writing", async () => {
    mocks.prisma.character.count.mockResolvedValue(0);

    await expect(
      createStoryline(
        "project_1",
        formData({
          name: "跨项目关系",
          characterIds: ["character_from_other_project"],
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/storylines?storylineError=invalidRelation#storylines",
    );
  });
});
