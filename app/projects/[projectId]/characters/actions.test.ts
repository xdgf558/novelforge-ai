import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adoptCharacterDraft,
  archiveCharacter,
  generateCharacterDraft,
} from "./actions";
import { expireStaleCharacterAiTasks } from "@/lib/ai/character-task-maintenance";

const mocks = vi.hoisted(() => {
  const tx = {
    aiTask: {
      updateMany: vi.fn(),
    },
    character: {
      create: vi.fn(),
      update: vi.fn(),
    },
    characterVersion: {
      count: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    notFound: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    ensureDefaultPromptTemplate: vi.fn(),
    startLoggedOpenAITextTask: vi.fn(),
    hasConfiguredOpenAIKey: vi.fn(),
    prisma: {
      project: {
        findUnique: vi.fn(),
      },
      character: {
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      characterRelationship: {
        findMany: vi.fn(),
      },
      outline: {
        findMany: vi.fn(),
      },
      aiTask: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
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

vi.mock("@/lib/ai/prompt-template-store", () => ({
  ensureDefaultPromptTemplate: mocks.ensureDefaultPromptTemplate,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  startLoggedOpenAITextTask: mocks.startLoggedOpenAITextTask,
}));

vi.mock("@/lib/ai/openai-client", () => ({
  hasConfiguredOpenAIKey: mocks.hasConfiguredOpenAIKey,
}));

const project = {
  id: "project_1",
  title: "离线未来",
  genre: "穿越",
  targetAudience: "20-40岁年轻人",
  platform: "个人网站",
  description: "程序员带着断网 AI 回到 1999 年。",
  setting: null,
};

function buildGenerationFormData() {
  const formData = new FormData();
  formData.set("targetRole", "阶段反派");
  formData.set("brief", "需要压迫主角早期电脑生意。");
  return formData;
}

describe("character AI actions", () => {
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
    mocks.prisma.project.findUnique.mockResolvedValue(project);
    mocks.prisma.character.findMany.mockResolvedValue([]);
    mocks.prisma.characterRelationship.findMany.mockResolvedValue([]);
    mocks.prisma.outline.findMany.mockResolvedValue([]);
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.aiTask.updateMany.mockResolvedValue({
      count: 0,
    });
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.tx.character.update.mockResolvedValue({
      id: "character_1",
      status: "archived",
    });
    mocks.tx.character.create.mockResolvedValue({
      id: "character_1",
      notes: "AI 建议关系（未自动写入正式关系网络）：\n与主角形成早期冲突",
    });
    mocks.tx.characterVersion.count.mockResolvedValue(2);
    mocks.tx.characterVersion.create.mockResolvedValue({});
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "template_1",
      taskType: "character_generation",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
      responseSchema: "{}",
    });
    mocks.startLoggedOpenAITextTask.mockResolvedValue({
      id: "task_1",
    });
  });

  it("marks stale character generation tasks as failed", async () => {
    const now = new Date("2026-06-21T02:00:00.000Z");

    await expireStaleCharacterAiTasks("project_1", now);

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        taskType: "character_generation",
        status: {
          in: ["pending", "running"],
        },
        OR: [
          {
            startedAt: {
              lt: new Date("2026-06-21T01:45:00.000Z"),
            },
          },
          {
            startedAt: null,
            createdAt: {
              lt: new Date("2026-06-21T01:45:00.000Z"),
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

  it("does not create another character generation task when one is active", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "active_task",
    });

    await expect(
      generateCharacterDraft("project_1", buildGenerationFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).not.toHaveBeenCalled();
  });

  it("does not create a generation task when API key is missing", async () => {
    mocks.hasConfiguredOpenAIKey.mockReturnValue(false);

    await expect(
      generateCharacterDraft("project_1", buildGenerationFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters?characterError=missingApiKey",
    );
  });

  it("starts a draft-only character generation task", async () => {
    await expect(
      generateCharacterDraft("project_1", buildGenerationFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        taskType: "character_generation",
        inputJson: expect.objectContaining({
          request: {
            targetRole: "阶段反派",
            brief: "需要压迫主角早期电脑生意。",
          },
        }),
      }),
      expect.objectContaining({
        input: expect.stringContaining("阶段反派"),
      }),
    );
    expect(mocks.tx.character.create).not.toHaveBeenCalled();
  });

  it("archives a character instead of hard deleting it", async () => {
    mocks.prisma.character.findFirst.mockResolvedValue({
      id: "character_1",
      projectId: "project_1",
      name: "谢勇",
      roleInStory: "主角发小",
      identity: "",
      status: "active",
      speakingStyle: "",
      desire: "",
      fear: "",
      secret: "",
      relationToProtagonist: "",
      relationToAntagonist: "",
      knownInfo: "",
      hiddenInfo: "",
      abilityBoundary: "",
      behaviorRules: "",
      characterArc: "",
      firstAppearance: "",
      latestAppearance: "",
      notes: "",
    });

    await expect(
      archiveCharacter("project_1", "character_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.character.delete).not.toHaveBeenCalled();
    expect(mocks.tx.character.update).toHaveBeenCalledWith({
      where: {
        id: "character_1",
      },
      data: {
        status: "archived",
      },
    });
    expect(mocks.tx.characterVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        characterId: "character_1",
        versionNumber: 3,
        sourceType: "manual_archive",
        snapshotJson: expect.stringContaining('"status":"archived"'),
      }),
    });
  });

  it("adopts a completed character draft into a formal character snapshot", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputContextSummary: "离线未来 人物草案生成",
      outputText: JSON.stringify({
        character: {
          name: "罗文斌",
          roleInStory: "早期阶段对手",
          identity: "县城电脑城老板",
        },
        suggestedRelationships: ["与陈远形成电脑培训班资源竞争。"],
      }),
      adoptionState: "not_reviewed",
    });
    mocks.tx.character.create.mockResolvedValue({
      id: "character_1",
      notes:
        "AI 建议关系（未自动写入正式关系网络）：\n与陈远形成电脑培训班资源竞争。",
    });

    await expect(
      adoptCharacterDraft("project_1", "task_1"),
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
    expect(mocks.tx.character.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "罗文斌",
        roleInStory: "早期阶段对手",
        identity: "县城电脑城老板",
        notes:
          "AI 建议关系（未自动写入正式关系网络）：\n与陈远形成电脑培训班资源竞争。",
      }),
    });
    expect(mocks.tx.characterVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        characterId: "character_1",
        sourceType: "ai_character_generation",
      }),
    });
  });

  it("clamps AI character draft fields before adoption", async () => {
    const longName = "罗".repeat(180);
    const longText = "长".repeat(9000);
    const longRelationship = "关系".repeat(400);

    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputContextSummary: "离线未来 人物草案生成",
      outputText: JSON.stringify({
        character: {
          name: longName,
          roleInStory: longText,
          notes: longText,
        },
        suggestedRelationships: [longRelationship],
      }),
      adoptionState: "not_reviewed",
    });
    mocks.tx.character.create.mockResolvedValue({
      id: "character_1",
      notes: "saved notes",
    });

    await expect(
      adoptCharacterDraft("project_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    const createCall = mocks.tx.character.create.mock.calls[0]?.[0];

    expect(createCall.data.name).toHaveLength(120);
    expect(createCall.data.roleInStory).toHaveLength(8000);
    expect(createCall.data.notes.length).toBeLessThanOrEqual(8000);
    expect(createCall.data.notes).toContain("AI 建议关系");
  });

  it("keeps character draft adoption idempotent", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      inputContextSummary: "离线未来 人物草案生成",
      outputText: JSON.stringify({
        character: {
          name: "罗文斌",
        },
      }),
      adoptionState: "not_reviewed",
    });
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      adoptCharacterDraft("project_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.tx.character.create).not.toHaveBeenCalled();
    expect(mocks.tx.characterVersion.create).not.toHaveBeenCalled();
  });
});
