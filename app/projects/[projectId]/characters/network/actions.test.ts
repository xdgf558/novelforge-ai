import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adoptCharacterRelationshipDrafts,
  archiveCharacterRelationship,
  createCharacterRelationship,
  generateCharacterRelationshipDrafts,
  updateCharacterRelationship,
} from "./actions";
import { expireStaleCharacterRelationshipAiTasks } from "@/lib/ai/character-relationship-task-maintenance";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  ensureDefaultPromptTemplate: vi.fn(),
  hasConfiguredOpenAIKey: vi.fn(),
  startLoggedOpenAITextTask: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    project: {
      findUnique: vi.fn(),
    },
    character: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    chapter: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    outline: {
      findMany: vi.fn(),
    },
    aiTask: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    characterRelationship: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  tx: {
    aiTask: {
      updateMany: vi.fn(),
    },
    characterRelationship: {
      count: vi.fn(),
      create: vi.fn(),
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

vi.mock("@/lib/ai/prompt-template-store", () => ({
  ensureDefaultPromptTemplate: mocks.ensureDefaultPromptTemplate,
}));

vi.mock("@/lib/ai/openai-client", () => ({
  hasConfiguredOpenAIKey: mocks.hasConfiguredOpenAIKey,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  startLoggedOpenAITextTask: mocks.startLoggedOpenAITextTask,
}));

function buildRelationshipFormData(
  overrides: Partial<Record<string, string>> = {},
) {
  const values = {
    sourceCharacterId: "character_a",
    targetCharacterId: "character_b",
    relationshipType: "ally",
    direction: "two_way",
    status: "active",
    summary: "两人是早期创业搭档。",
    dynamics: "后续会因为利益分配产生裂缝。",
    evidence: "第 2 章确认合伙。",
    sourceChapterId: "chapter_2",
    ...overrides,
  };
  const formData = new FormData();

  Object.entries(values).forEach(([name, value]) => {
    formData.set(name, value);
  });

  return formData;
}

describe("character relationship actions", () => {
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
    mocks.hasConfiguredOpenAIKey.mockReturnValue(true);
    mocks.prisma.project.findUnique.mockResolvedValue({
      id: "project_1",
      title: "离线未来",
      genre: "穿越",
      targetAudience: "20-40岁年轻人",
      platform: "个人网站",
      description: "程序员带着断网 AI 回到 1999 年。",
      setting: null,
    });
    mocks.prisma.character.count.mockResolvedValue(2);
    mocks.prisma.character.findMany.mockResolvedValue([
      {
        id: "character_a",
        name: "陈远",
        status: "active",
      },
      {
        id: "character_b",
        name: "谢勇",
        status: "active",
      },
    ]);
    mocks.prisma.chapter.count.mockResolvedValue(1);
    mocks.prisma.chapter.findMany.mockResolvedValue([
      {
        id: "chapter_2",
        chapterNumber: 2,
        title: "谢勇出场",
        status: "final",
        goal: "确认合伙。",
        aiTasks: [],
      },
    ]);
    mocks.prisma.outline.findMany.mockResolvedValue([]);
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.aiTask.updateMany.mockResolvedValue({
      count: 0,
    });
    mocks.prisma.characterRelationship.create.mockResolvedValue({
      id: "relationship_1",
    });
    mocks.prisma.characterRelationship.count.mockResolvedValue(0);
    mocks.prisma.characterRelationship.findMany.mockResolvedValue([]);
    mocks.prisma.characterRelationship.findFirst.mockResolvedValue({
      id: "relationship_1",
    });
    mocks.prisma.characterRelationship.update.mockResolvedValue({
      id: "relationship_1",
    });
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.tx.characterRelationship.count.mockResolvedValue(0);
    mocks.tx.characterRelationship.create.mockResolvedValue({
      id: "relationship_1",
    });
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "template_1",
      taskType: "character_relationship_generation",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
      responseSchema: "{}",
    });
    mocks.startLoggedOpenAITextTask.mockResolvedValue({
      id: "task_1",
    });
  });

  it("marks stale character relationship generation tasks as failed", async () => {
    const now = new Date("2026-06-22T04:00:00.000Z");

    await expireStaleCharacterRelationshipAiTasks("project_1", now);

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        taskType: "character_relationship_generation",
        status: {
          in: ["pending", "running"],
        },
        OR: [
          {
            startedAt: {
              lt: new Date("2026-06-22T03:45:00.000Z"),
            },
          },
          {
            startedAt: null,
            createdAt: {
              lt: new Date("2026-06-22T03:45:00.000Z"),
            },
          },
        ],
      },
      data: {
        status: "failed",
        errorMessage:
          "AI 任务运行超过 15 分钟，已自动标记为失败。请重新生成。",
        completedAt: now,
      },
    });
  });

  it("creates a relationship when both characters and chapter belong to the project", async () => {
    await expect(
      createCharacterRelationship("project_1", buildRelationshipFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.characterRelationship.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        sourceCharacterId: "character_a",
        targetCharacterId: "character_b",
        relationshipType: "ally",
        summary: "两人是早期创业搭档。",
      }),
    });
  });

  it("rejects relationships where both ends are the same character", async () => {
    await expect(
      createCharacterRelationship(
        "project_1",
        buildRelationshipFormData({
          targetCharacterId: "character_a",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=sameCharacter",
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("rejects cross-project character references", async () => {
    mocks.prisma.character.count.mockResolvedValue(1);

    await expect(
      createCharacterRelationship("project_1", buildRelationshipFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=invalidCharacterReference",
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("rejects cross-project source chapter references", async () => {
    mocks.prisma.chapter.count.mockResolvedValue(0);

    await expect(
      createCharacterRelationship("project_1", buildRelationshipFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=invalidChapterReference",
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("rejects creating new relationships with archived character endpoints", async () => {
    mocks.prisma.character.findMany.mockResolvedValue([
      {
        id: "character_a",
        status: "active",
      },
      {
        id: "character_b",
        status: "archived",
      },
    ]);

    await expect(
      createCharacterRelationship("project_1", buildRelationshipFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=archivedCharacterReference",
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate active relationships for the same pair, type, and direction", async () => {
    mocks.prisma.characterRelationship.count.mockResolvedValue(1);

    await expect(
      createCharacterRelationship("project_1", buildRelationshipFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=duplicateRelationship",
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("updates only relationships owned by the current project", async () => {
    await expect(
      updateCharacterRelationship(
        "project_1",
        "relationship_1",
        buildRelationshipFormData({
          status: "tension",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.characterRelationship.findFirst).toHaveBeenCalledWith({
      where: {
        id: "relationship_1",
        projectId: "project_1",
      },
      select: {
        id: true,
      },
    });
    expect(mocks.prisma.characterRelationship.update).toHaveBeenCalledWith({
      where: {
        id: "relationship_1",
      },
      data: expect.objectContaining({
        status: "tension",
      }),
    });
  });

  it("archives relationships instead of hard deleting them", async () => {
    await expect(
      archiveCharacterRelationship("project_1", "relationship_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.characterRelationship.update).toHaveBeenCalledWith({
      where: {
        id: "relationship_1",
      },
      data: {
        status: "archived",
      },
    });
  });

  it("starts a draft-only character relationship generation task", async () => {
    await expect(
      generateCharacterRelationshipDrafts("project_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        taskType: "character_relationship_generation",
        inputJson: expect.objectContaining({
          characters: expect.arrayContaining([
            expect.objectContaining({
              id: "character_a",
              name: "陈远",
            }),
          ]),
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("可用角色"),
      }),
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("does not create relationship generation tasks without an API key", async () => {
    mocks.hasConfiguredOpenAIKey.mockReturnValue(false);

    await expect(
      generateCharacterRelationshipDrafts("project_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=missingApiKey",
    );
  });

  it("does not create another relationship generation task while one is active", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "active_task",
    });

    await expect(
      generateCharacterRelationshipDrafts("project_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=activeRelationshipTask",
    );
  });

  it("adopts completed relationship drafts into formal relationships", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputContextSummary: "离线未来 人物关系草案生成",
      outputText: JSON.stringify({
        relationships: [
          {
            sourceCharacterId: "character_a",
            sourceCharacterName: "陈远",
            targetCharacterId: "character_b",
            targetCharacterName: "谢勇",
            relationshipType: "partner",
            direction: "two_way",
            status: "active",
            summary: "两人是早期创业搭档。",
            dynamics: "后续可能因利益分配出现张力。",
            evidence: "第2章确认合伙。",
            sourceChapterNumber: 2,
          },
        ],
      }),
      adoptionState: "not_reviewed",
    });

    await expect(
      adoptCharacterRelationshipDrafts("project_1", "task_1"),
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
    expect(mocks.tx.characterRelationship.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        sourceCharacterId: "character_a",
        targetCharacterId: "character_b",
        relationshipType: "partner",
        direction: "two_way",
        status: "active",
        summary: "两人是早期创业搭档。",
        sourceChapterId: "chapter_2",
      }),
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipAdopted=1",
    );
  });

  it("does not mark relationship draft tasks adopted when every draft is duplicate", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputContextSummary: "离线未来 人物关系草案生成",
      outputText: JSON.stringify({
        relationships: [
          {
            sourceCharacterId: "character_a",
            targetCharacterId: "character_b",
            relationshipType: "partner",
            direction: "two_way",
            status: "active",
            summary: "两人是早期创业搭档。",
          },
        ],
      }),
      adoptionState: "not_reviewed",
    });
    mocks.tx.characterRelationship.count.mockResolvedValue(1);

    await expect(
      adoptCharacterRelationshipDrafts("project_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.aiTask.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.characterRelationship.create).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=adoptedNoRelationships",
    );
  });

  it("keeps relationship draft adoption idempotent", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputContextSummary: "离线未来 人物关系草案生成",
      outputText: JSON.stringify({
        relationships: [
          {
            sourceCharacterId: "character_a",
            targetCharacterId: "character_b",
            summary: "两人是早期创业搭档。",
          },
        ],
      }),
      adoptionState: "not_reviewed",
    });
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      adoptCharacterRelationshipDrafts("project_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.characterRelationship.create).not.toHaveBeenCalled();
  });
});
