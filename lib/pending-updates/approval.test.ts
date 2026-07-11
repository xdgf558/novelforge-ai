import { describe, expect, it, vi } from "vitest";
import {
  applyApprovedPendingUpdate,
  PendingUpdateTargetNotFoundError,
} from "./approval";

function pendingCharacterUpdate() {
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
});
