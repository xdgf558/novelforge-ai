import { describe, expect, it, vi } from "vitest";
import {
  applyApprovedPendingUpdate,
  PendingUpdateTargetNotFoundError,
} from "./approval";

function pendingCharacterUpdate(overrides: Record<string, unknown> = {}) {
  return {
    id: "update_1",
    projectId: "project_1",
    chapterId: "chapter_1",
    aiTaskId: "task_1",
    updateType: "update",
    targetType: "character",
    targetId: null,
    targetName: "同名角色",
    fieldName: "identity",
    title: "更新角色身份",
    proposedContent: "新的身份信息",
    reason: null,
    riskLevel: "medium",
    evidence: null,
    payloadJson: null,
    sourceTextHash: null,
    status: "pending",
    resolutionNote: null,
    appliedAt: null,
    createdAt: new Date("2026-07-11T00:00:00.000Z"),
    updatedAt: new Date("2026-07-11T00:00:00.000Z"),
    ...overrides,
  };
}

describe("pending update approval service", () => {
  it("refuses a name fallback when more than one character matches", async () => {
    const tx = {
      character: {
        findMany: vi.fn(async () => [
          { id: "character_1", name: "同名角色" },
          { id: "character_2", name: "同名角色" },
        ]),
        update: vi.fn(),
      },
    };

    await expect(
      applyApprovedPendingUpdate(
        tx as never,
        pendingCharacterUpdate(),
        "新的身份信息",
      ),
    ).rejects.toBeInstanceOf(PendingUpdateTargetNotFoundError);
    expect(tx.character.update).not.toHaveBeenCalled();
  });

  it("falls back to a unique project character when the stored id is invalid", async () => {
    const existingCharacter = {
      id: "character_1",
      projectId: "project_1",
      name: "沈照夜",
      status: "active",
      identity: "大理寺刑狱官",
    };
    const tx = {
      character: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => [existingCharacter]),
        update: vi.fn(async () => ({
          ...existingCharacter,
          identity: "大理寺刑狱官\n\n沈家旧案遗孤",
        })),
      },
      characterVersion: {
        count: vi.fn(async () => 2),
        create: vi.fn(async () => ({})),
      },
    };

    await applyApprovedPendingUpdate(
      tx as never,
      pendingCharacterUpdate({
        targetId: "hallucinated-character-id",
        targetName: "沈照夜",
      }),
      "沈家旧案遗孤",
    );

    expect(tx.character.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        name: "沈照夜",
      },
      take: 2,
    });
    expect(tx.character.update).toHaveBeenCalledWith({
      where: { id: "character_1" },
      data: { identity: "大理寺刑狱官\n\n沈家旧案遗孤" },
    });
  });

  it("falls back to a unique foreshadow when its stored id is invalid", async () => {
    const existingForeshadow = {
      id: "foreshadow_1",
      projectId: "project_1",
      content: "拨单人印鉴断笔中藏有代字。",
      status: "planted",
    };
    const tx = {
      foreshadow: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => [existingForeshadow]),
        update: vi.fn(async () => ({})),
      },
    };

    await applyApprovedPendingUpdate(
      tx as never,
      pendingCharacterUpdate({
        targetType: "foreshadow",
        targetId: "wrong-type-id",
        targetName: "拨单人印鉴断笔",
        title: "推进拨单人伏笔",
      }),
      "笔画已重组为代王。",
    );

    expect(tx.foreshadow.update).toHaveBeenCalledWith({
      where: { id: "foreshadow_1" },
      data: expect.objectContaining({
        status: "advancing",
        pendingUpdateId: "update_1",
      }),
    });
  });

  it("falls back to a unique world rule title when its stored id is invalid", async () => {
    const existingRule = {
      id: "rule_1",
      projectId: "project_1",
      title: "内府直拨军饷规则",
      content: "军饷由内府直拨。",
    };
    const tx = {
      worldRule: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => [existingRule]),
        update: vi.fn(async () => ({})),
      },
    };

    await applyApprovedPendingUpdate(
      tx as never,
      pendingCharacterUpdate({
        targetType: "world_rule",
        targetId: "hallucinated-rule-id",
        targetName: "内府直拨军饷规则",
        title: "更新军饷路径",
      }),
      "军饷分为三段转拨。",
    );

    expect(tx.worldRule.update).toHaveBeenCalledWith({
      where: { id: "rule_1" },
      data: expect.objectContaining({
        pendingUpdateId: "update_1",
        sourceChapterId: "chapter_1",
      }),
    });
  });

  it("falls back to a unique timeline title when its stored id is invalid", async () => {
    const existingEvent = {
      id: "timeline_1",
      projectId: "project_1",
      title: "沈鹤鸣调阅底册",
      description: "沈鹤鸣在下狱前调阅底册。",
    };
    const tx = {
      timelineEvent: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => [existingEvent]),
        update: vi.fn(async () => ({})),
      },
    };

    await applyApprovedPendingUpdate(
      tx as never,
      pendingCharacterUpdate({
        targetType: "timeline_event",
        targetId: "hallucinated-timeline-id",
        targetName: "沈鹤鸣调阅底册",
        title: "更新调阅时间",
      }),
      "时间锁定为十月初八。",
    );

    expect(tx.timelineEvent.update).toHaveBeenCalledWith({
      where: { id: "timeline_1" },
      data: expect.objectContaining({
        pendingUpdateId: "update_1",
        sourceChapterId: "chapter_1",
      }),
    });
  });

  it("recovers a real cross-type target id from the stored audit payload", async () => {
    const existingEvent = {
      id: "timeline_1",
      projectId: "project_1",
      title: "沈鹤鸣调阅底册",
      description: "沈鹤鸣在下狱前调阅底册。",
    };
    const tx = {
      character: {
        findFirst: vi.fn(async () => null),
      },
      worldRule: {
        findFirst: vi.fn(async () => null),
      },
      foreshadow: {
        findFirst: vi.fn(async () => null),
      },
      timelineEvent: {
        findFirst: vi.fn(async () => existingEvent),
        update: vi.fn(async () => ({})),
      },
    };

    const appliedTarget = await applyApprovedPendingUpdate(
      tx as never,
      pendingCharacterUpdate({
        targetType: "foreshadow",
        targetId: null,
        targetName: "沈鹤鸣调阅底册并下狱",
        payloadJson: JSON.stringify({
          targetType: "foreshadow",
          targetId: "timeline_1",
        }),
      }),
      "时间锁定为十月初八。",
    );

    expect(appliedTarget).toEqual({
      targetId: "timeline_1",
      targetType: "timeline_event",
    });
    expect(tx.timelineEvent.update).toHaveBeenCalledWith({
      where: { id: "timeline_1" },
      data: expect.objectContaining({
        description: "沈鹤鸣在下狱前调阅底册。\n\n时间锁定为十月初八。",
        pendingUpdateId: "update_1",
      }),
    });
  });

  it("builds a setting snapshot from the upsert result", async () => {
    const updatedSetting = {
      id: "setting_1",
      projectId: "project_1",
      worldviewRules: "旧规则\n\n新规则",
    };
    const tx = {
      projectSetting: {
        findUnique: vi.fn(async () => ({ worldviewRules: "旧规则" })),
        upsert: vi.fn(async () => updatedSetting),
      },
      settingVersion: {
        count: vi.fn(async () => 1),
        create: vi.fn(async () => ({})),
      },
    };

    await applyApprovedPendingUpdate(
      tx as never,
      pendingCharacterUpdate({
        targetType: "project_setting",
        targetId: null,
        targetName: "世界观规则",
        fieldName: "worldviewRules",
        title: "更新世界观规则",
      }),
      "新规则",
    );

    expect(tx.settingVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        settingId: "setting_1",
        versionNumber: 2,
        snapshotJson: expect.stringContaining("旧规则\\n\\n新规则"),
      }),
    });
  });

  it("builds a character snapshot from the update result", async () => {
    const existingCharacter = {
      id: "character_1",
      projectId: "project_1",
      name: "沈照夜",
      status: "active",
      identity: "大理寺刑狱官",
    };
    const updatedCharacter = {
      ...existingCharacter,
      identity: "大理寺刑狱官\n\n沈家旧案遗孤",
    };
    const tx = {
      character: {
        findFirst: vi.fn(async () => existingCharacter),
        update: vi.fn(async () => updatedCharacter),
      },
      characterVersion: {
        count: vi.fn(async () => 2),
        create: vi.fn(async () => ({})),
      },
    };

    await applyApprovedPendingUpdate(
      tx as never,
      pendingCharacterUpdate({
        targetId: "character_1",
        targetName: "沈照夜",
      }),
      "沈家旧案遗孤",
    );

    expect(tx.characterVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        characterId: "character_1",
        versionNumber: 3,
        snapshotJson: expect.stringContaining("沈家旧案遗孤"),
      }),
    });
  });
});
