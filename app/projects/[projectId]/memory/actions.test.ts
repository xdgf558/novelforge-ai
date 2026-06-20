import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createForeshadow,
  createTimelineEvent,
  createWorldRule,
  deleteWorldRule,
} from "./actions";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    chapter: {
      count: vi.fn(),
    },
    worldRule: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    foreshadow: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    timelineEvent: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

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

function formData(values: Record<string, string | number | boolean>) {
  const data = new FormData();

  Object.entries(values).forEach(([name, value]) => {
    if (value === true) {
      data.set(name, "on");
    } else if (value !== false) {
      data.set(name, String(value));
    }
  });

  return data;
}

describe("story memory actions", () => {
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
    mocks.prisma.worldRule.findFirst.mockResolvedValue({
      id: "rule_1",
    });
    mocks.prisma.chapter.count.mockResolvedValue(1);
    mocks.prisma.worldRule.create.mockResolvedValue({
      id: "rule_1",
    });
    mocks.prisma.foreshadow.create.mockResolvedValue({
      id: "foreshadow_1",
    });
    mocks.prisma.timelineEvent.create.mockResolvedValue({
      id: "event_1",
    });
  });

  it("creates a world rule with Phase 22 management metadata", async () => {
    await expect(
      createWorldRule(
        "project_1",
        formData({
          title: "零号离线规则",
          content: "零号不能实时联网，只能使用本地资料推理。",
          category: "technology_rule",
          riskLevel: "high",
          status: "active",
          scope: "所有 AI 提示场景",
          relatedCharacters: "陈远、零号",
          relatedLocations: "县城家中",
          relatedOrganizations: "无",
          sourceChapterId: "chapter_1",
          isCore: true,
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.worldRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        title: "零号离线规则",
        category: "technology_rule",
        riskLevel: "high",
        status: "active",
        isCore: true,
        scope: "所有 AI 提示场景",
        relatedCharacters: "陈远、零号",
        sourceChapterId: "chapter_1",
      }),
    });
  });

  it("normalizes invalid world rule categories to other", async () => {
    await expect(
      createWorldRule(
        "project_1",
        formData({
          title: "自定义规则",
          content: "自定义表单值不会污染分类枚举。",
          category: "custom_category",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.worldRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: "other",
      }),
    });
  });

  it("rejects cross-project chapter references before creating world rules", async () => {
    mocks.prisma.chapter.count.mockResolvedValue(0);

    await expect(
      createWorldRule(
        "project_1",
        formData({
          title: "跨项目规则",
          content: "这条规则不应该写入。",
          sourceChapterId: "chapter_from_other_project",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.worldRule.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/memory?memoryError=invalidChapterReference",
    );
  });

  it("creates a foreshadow with expected resolution and related story metadata", async () => {
    await expect(
      createForeshadow(
        "project_1",
        formData({
          content: "零号说欢迎回来，暗示它知道穿越前后。",
          status: "advancing",
          importance: "high",
          expectedResolveChapter: 30,
          relatedCharacters: "陈远、零号",
          relatedLocations: "县城家中",
          relatedFactions: "主角阵营",
          plantedChapterId: "chapter_1",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.foreshadow.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        content: "零号说欢迎回来，暗示它知道穿越前后。",
        status: "advancing",
        importance: "high",
        expectedResolveChapter: 30,
        relatedCharacters: "陈远、零号",
        plantedChapterId: "chapter_1",
      }),
    });
  });

  it("rejects invalid foreshadow chapter numbers without writing formal memory", async () => {
    await expect(
      createForeshadow(
        "project_1",
        formData({
          content: "一个伏笔",
          expectedResolveChapter: 0,
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.foreshadow.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/memory?memoryError=invalidExpectedResolveChapter",
    );
  });

  it("creates a timeline event with location and related characters", async () => {
    await expect(
      createTimelineEvent(
        "project_1",
        formData({
          title: "陈远重生",
          description: "陈远在 1999 年夏天醒来，确认自己重生。",
          status: "active",
          storyTime: "1999年6月15日上午",
          relatedCharacters: "陈远",
          location: "县城家中",
          impact: "开启第一卷行动线。",
          chapterId: "chapter_1",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        title: "陈远重生",
        status: "active",
        relatedCharacters: "陈远",
        location: "县城家中",
        chapterId: "chapter_1",
      }),
    });
  });

  it("does not delete a world rule from another project", async () => {
    mocks.prisma.worldRule.findFirst.mockResolvedValue(null);

    await expect(deleteWorldRule("project_1", "rule_other")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.worldRule.update).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/memory?memoryError=recordNotFound",
    );
  });

  it("archives a world rule instead of hard-deleting formal memory", async () => {
    await expect(deleteWorldRule("project_1", "rule_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.worldRule.update).toHaveBeenCalledWith({
      where: {
        id: "rule_1",
      },
      data: {
        status: "archived",
      },
    });
    expect(mocks.prisma.worldRule.delete).not.toHaveBeenCalled();
  });
});
