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
