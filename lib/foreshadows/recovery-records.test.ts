import { beforeEach, describe, expect, it, vi } from "vitest";
import { chapterFinalTextHash } from "@/lib/chapters/source-text";
import { buildAutomaticForeshadowRecoveryPayload } from "./recovery-audit";

const mocks = vi.hoisted(() => {
  class PendingUpdateTargetNotFoundError extends Error {}
  const tx = {
    chapter: {
      findMany: vi.fn(),
    },
    foreshadow: {
      findMany: vi.fn(),
    },
    pendingUpdate: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    applyApprovedPendingUpdate: vi.fn(),
    PendingUpdateTargetNotFoundError,
    prisma: {
      pendingUpdate: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => unknown) => callback(tx),
      ),
    },
    tx,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/pending-updates/approval", () => ({
  applyApprovedPendingUpdate: mocks.applyApprovedPendingUpdate,
  PendingUpdateTargetNotFoundError: mocks.PendingUpdateTargetNotFoundError,
}));

import {
  approveAutomaticForeshadowRecoveries,
  countAutomaticForeshadowRecoveryCandidates,
  persistAutomaticForeshadowRecoverySuggestions,
} from "./recovery-records";

const finalText = "正文明确确认旧印来自宗正寺内库。";

function highConfidencePayload() {
  return buildAutomaticForeshadowRecoveryPayload({
    targetId: "foreshadow_1",
    action: "resolve",
    resolvedChapterId: "chapter_8",
    summary: "旧印来源已经确认。",
    evidence: "宗正寺内库登记册。",
    confidence: "high",
  });
}

function pendingRecovery(overrides: Record<string, unknown> = {}) {
  return {
    id: "update_1",
    projectId: "project_1",
    chapterId: "chapter_8",
    aiTaskId: "task_1",
    updateType: "resolve",
    targetType: "foreshadow",
    targetId: "foreshadow_1",
    targetName: "旧印来源不明",
    fieldName: "status",
    title: "自动识别回收：旧印来源不明",
    proposedContent: "旧印来源已经确认。",
    reason: "章节证据明确。",
    riskLevel: "medium",
    evidence: "宗正寺内库登记册。",
    payloadJson: highConfidencePayload(),
    sourceTextHash: chapterFinalTextHash(finalText),
    status: "pending",
    resolutionNote: null,
    appliedAt: null,
    createdAt: new Date("2026-07-11T00:00:00.000Z"),
    updatedAt: new Date("2026-07-11T00:00:00.000Z"),
    chapter: {
      finalText,
    },
    ...overrides,
  };
}

describe("automatic foreshadow recovery records", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.foreshadow.findMany.mockResolvedValue([
      {
        id: "foreshadow_1",
        status: "planted",
      },
    ]);
    mocks.tx.chapter.findMany.mockResolvedValue([
      {
        id: "chapter_8",
        finalText,
      },
    ]);
    mocks.tx.pendingUpdate.findMany.mockResolvedValue([]);
    mocks.tx.pendingUpdate.create.mockResolvedValue({ id: "update_1" });
  });

  it("creates a source-bound pending recovery instead of mutating formal memory", async () => {
    const created = await persistAutomaticForeshadowRecoverySuggestions({
      projectId: "project_1",
      task: {
        id: "task_1",
        outputText: JSON.stringify({
          updates: [
            {
              targetId: "foreshadow_1",
              action: "resolve",
              resolvedChapterId: "chapter_8",
              summary: "旧印来源已经确认。",
              evidence: "宗正寺内库登记册写明旧印来源。",
              confidence: "high",
            },
          ],
        }),
      },
      foreshadows: [
        {
          id: "foreshadow_1",
          content: "旧印来源不明。",
          status: "planted",
          importance: "high",
          plantedChapterNumber: 1,
        },
      ],
      chapters: [
        {
          id: "chapter_8",
          chapterNumber: 8,
          title: "密折夜渡",
          summary: "确认旧印来源。",
          finalText,
        },
      ],
    });

    expect(created).toBe(1);
    expect(mocks.tx.pendingUpdate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        chapterId: "chapter_8",
        updateType: "resolve",
        targetType: "foreshadow",
        targetId: "foreshadow_1",
        sourceTextHash: chapterFinalTextHash(finalText),
      }),
    });
    expect(mocks.applyApprovedPendingUpdate).not.toHaveBeenCalled();
  });

  it("does not create another recovery candidate while the same target awaits review", async () => {
    mocks.tx.pendingUpdate.findMany.mockResolvedValue([
      {
        targetId: "foreshadow_1",
        chapterId: "chapter_7",
        updateType: "update",
      },
    ]);

    const created = await persistAutomaticForeshadowRecoverySuggestions({
      projectId: "project_1",
      task: {
        id: "task_2",
        outputText: JSON.stringify({
          foreshadowUpdates: [
            {
              targetId: "foreshadow_1",
              action: "resolve",
              summary: "重复候选。",
              evidence: "重复证据。",
              confidence: "high",
            },
          ],
        }),
      },
      fallbackChapterId: "chapter_8",
      foreshadows: [
        {
          id: "foreshadow_1",
          content: "旧印来源不明。",
          status: "planted",
          importance: "high",
        },
      ],
      chapters: [
        {
          id: "chapter_8",
          chapterNumber: 8,
          title: "密折夜渡",
          summary: "确认旧印来源。",
          finalText,
        },
      ],
    });

    expect(created).toBe(0);
    expect(mocks.tx.pendingUpdate.create).not.toHaveBeenCalled();
  });

  it("only counts high-confidence candidates whose source text is still current", async () => {
    mocks.prisma.pendingUpdate.findMany.mockResolvedValue([
      pendingRecovery(),
      pendingRecovery({
        id: "update_medium",
        payloadJson: buildAutomaticForeshadowRecoveryPayload({
          targetId: "foreshadow_2",
          action: "resolve",
          resolvedChapterId: "chapter_8",
          summary: "中置信候选。",
          evidence: "证据。",
          confidence: "medium",
        }),
      }),
      pendingRecovery({
        id: "update_stale",
        chapter: {
          finalText: "后来修改过的正文",
        },
      }),
    ]);

    await expect(
      countAutomaticForeshadowRecoveryCandidates("project_1"),
    ).resolves.toBe(1);
  });

  it("batch approval resolves current targets and skips targets already handled", async () => {
    mocks.prisma.pendingUpdate.findMany.mockResolvedValue([
      pendingRecovery(),
      pendingRecovery({
        id: "update_2",
        targetId: "foreshadow_already_resolved",
        payloadJson: buildAutomaticForeshadowRecoveryPayload({
          targetId: "foreshadow_already_resolved",
          action: "resolve",
          resolvedChapterId: "chapter_8",
          summary: "已由另一操作处理。",
          evidence: "证据。",
          confidence: "high",
        }),
      }),
    ]);

    const result = await approveAutomaticForeshadowRecoveries("project_1");

    expect(result).toEqual({
      approvedCount: 1,
      skippedCount: 1,
    });
    expect(mocks.applyApprovedPendingUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.tx.pendingUpdate.update).toHaveBeenCalledWith({
      where: {
        id: "update_1",
      },
      data: expect.objectContaining({
        status: "approved",
      }),
    });
  });

  it("rechecks final text inside the approval transaction", async () => {
    mocks.prisma.pendingUpdate.findMany.mockResolvedValue([pendingRecovery()]);
    mocks.tx.chapter.findMany.mockResolvedValue([
      {
        id: "chapter_8",
        finalText: "作者在确认前刚刚修改的定稿。",
      },
    ]);

    await expect(
      approveAutomaticForeshadowRecoveries("project_1"),
    ).resolves.toEqual({
      approvedCount: 0,
      skippedCount: 1,
    });
    expect(mocks.applyApprovedPendingUpdate).not.toHaveBeenCalled();
  });
});
