import { beforeEach, describe, expect, it, vi } from "vitest";
import { chapterFinalTextHash } from "@/lib/chapters/source-text";

const mocks = vi.hoisted(() => {
  const tx = {
    character: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    characterVersion: {
      count: vi.fn(),
      create: vi.fn(),
    },
    foreshadow: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    pendingUpdate: {
      update: vi.fn(),
    },
    timelineEvent: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    worldRule: {
      findFirst: vi.fn(),
    },
  };

  return {
    notFound: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    approveAutomaticForeshadowRecoveries: vi.fn(),
    assertProject: vi.fn(),
    prisma: {
      pendingUpdate: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => unknown) => callback(tx),
      ),
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

vi.mock("@/lib/foreshadows/recovery-records", () => ({
  approveAutomaticForeshadowRecoveries:
    mocks.approveAutomaticForeshadowRecoveries,
}));

vi.mock("@/lib/server-actions/project-guards", () => ({
  assertProjectExists: mocks.assertProject,
}));

import {
  approveAutomaticForeshadowRecoveryBatch,
  approvePendingUpdate,
} from "./actions";

function pendingForeshadowUpdate(overrides: Record<string, unknown> = {}) {
  const finalText = "当前定稿正文";

  return {
    id: "update_1",
    projectId: "project_1",
    chapterId: "chapter_1",
    aiTaskId: "task_1",
    updateType: "resolve",
    targetType: "foreshadow",
    targetId: "foreshadow_1",
    targetName: "旧印来源",
    fieldName: null,
    title: "回收旧印来源伏笔",
    proposedContent: "确认旧印来自内库。",
    reason: "正文明确揭晓。",
    riskLevel: "medium",
    evidence: "内库封条",
    payloadJson: null,
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

describe("pending update approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.foreshadow.findFirst.mockResolvedValue({
      id: "foreshadow_1",
      content: "旧印来源不明。",
      status: "planted",
    });
    mocks.tx.character.findFirst.mockResolvedValue(null);
    mocks.tx.character.findMany.mockResolvedValue([]);
    mocks.tx.characterVersion.count.mockResolvedValue(0);
    mocks.tx.timelineEvent.findFirst.mockResolvedValue(null);
    mocks.tx.worldRule.findFirst.mockResolvedValue(null);
    mocks.approveAutomaticForeshadowRecoveries.mockResolvedValue({
      approvedCount: 3,
      skippedCount: 1,
    });
  });

  it("resolves the targeted existing foreshadow instead of creating a duplicate", async () => {
    mocks.prisma.pendingUpdate.findFirst.mockResolvedValue(
      pendingForeshadowUpdate(),
    );
    const formData = new FormData();
    formData.set("proposedContent", "确认旧印来自内库。");

    await approvePendingUpdate("project_1", "update_1", formData);

    expect(mocks.tx.foreshadow.findFirst).toHaveBeenCalledWith({
      where: {
        id: "foreshadow_1",
        projectId: "project_1",
      },
    });
    expect(mocks.tx.foreshadow.update).toHaveBeenCalledWith({
      where: {
        id: "foreshadow_1",
      },
      data: expect.objectContaining({
        content: "旧印来源不明。\n\n确认旧印来自内库。",
        status: "resolved",
        resolvedChapterId: "chapter_1",
        pendingUpdateId: "update_1",
      }),
    });
    expect(mocks.tx.foreshadow.create).not.toHaveBeenCalled();
  });

  it("does not apply a suggestion generated from an older final text", async () => {
    mocks.prisma.pendingUpdate.findFirst.mockResolvedValue(
      pendingForeshadowUpdate({
        chapter: {
          finalText: "作者后来修改过的定稿正文",
        },
      }),
    );
    mocks.redirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const formData = new FormData();
    formData.set("proposedContent", "确认旧印来自内库。");

    await expect(
      approvePendingUpdate("project_1", "update_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.foreshadow.update).not.toHaveBeenCalled();
  });

  it("explicitly approves an unmatched character suggestion as a new character", async () => {
    mocks.prisma.pendingUpdate.findFirst.mockResolvedValue(
      pendingForeshadowUpdate({
        updateType: "update",
        targetType: "character",
        targetId: null,
        targetName: "万俟衡之子",
        fieldName: "备注",
        title: "万俟衡之子被救出并提供关键口供",
        proposedContent: "万俟衡之子获救并提供关键口供。",
      }),
    );
    mocks.tx.character.create.mockResolvedValue({
      id: "character_new",
      projectId: "project_1",
      name: "万俟衡之子",
      status: "active",
      notes: "万俟衡之子获救并提供关键口供。",
    });
    const formData = new FormData();
    formData.set("proposedContent", "万俟衡之子获救并提供关键口供。");
    formData.set("createMissingCharacter", "1");

    await approvePendingUpdate("project_1", "update_1", formData);

    expect(mocks.tx.character.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "万俟衡之子",
        notes: "万俟衡之子获救并提供关键口供。",
      }),
    });
    expect(mocks.tx.characterVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        characterId: "character_new",
        versionNumber: 1,
        sourceType: "pending_update",
      }),
    });
    expect(mocks.tx.pendingUpdate.update).toHaveBeenCalledWith({
      where: {
        id: "update_1",
      },
      data: expect.objectContaining({
        status: "approved",
        targetId: "character_new",
        targetType: "character",
        updateType: "create",
      }),
    });
  });

  it("persists a recovered cross-type target in the approval audit record", async () => {
    const timelineEvent = {
      id: "timeline_1",
      projectId: "project_1",
      title: "沈鹤鸣调阅底册",
      description: "沈鹤鸣在下狱前调阅底册。",
    };
    mocks.prisma.pendingUpdate.findFirst.mockResolvedValue(
      pendingForeshadowUpdate({
        targetId: null,
        targetName: "沈鹤鸣调阅底册并下狱",
        payloadJson: JSON.stringify({
          targetType: "foreshadow",
          targetId: "timeline_1",
        }),
      }),
    );
    mocks.tx.foreshadow.findFirst.mockImplementation(async ({ where }) =>
      where.id === "foreshadow_1"
        ? {
            id: "foreshadow_1",
            content: "旧印来源不明。",
            status: "planted",
          }
        : null,
    );
    mocks.tx.timelineEvent.findFirst.mockResolvedValue(timelineEvent);
    const formData = new FormData();
    formData.set("proposedContent", "时间锁定为十月初八。");

    await approvePendingUpdate("project_1", "update_1", formData);

    expect(mocks.tx.timelineEvent.update).toHaveBeenCalledWith({
      where: { id: "timeline_1" },
      data: expect.objectContaining({
        pendingUpdateId: "update_1",
      }),
    });
    expect(mocks.tx.pendingUpdate.update).toHaveBeenCalledWith({
      where: { id: "update_1" },
      data: expect.objectContaining({
        status: "approved",
        targetId: "timeline_1",
        targetType: "timeline_event",
      }),
    });
  });

  it("batch-confirms only the automatic recovery candidates returned by the service", async () => {
    mocks.redirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(
      approveAutomaticForeshadowRecoveryBatch("project_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.approveAutomaticForeshadowRecoveries).toHaveBeenCalledWith(
      "project_1",
    );
    expect(mocks.assertProject).toHaveBeenCalledWith("project_1");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/pending-updates?review=auto-recovery-approved&approved=3&skipped=1",
    );
  });
});
