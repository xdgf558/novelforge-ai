import { beforeEach, describe, expect, it, vi } from "vitest";
import { chapterFinalTextHash } from "@/lib/chapters/source-text";

const mocks = vi.hoisted(() => {
  const tx = {
    foreshadow: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    pendingUpdate: {
      update: vi.fn(),
    },
  };

  return {
    notFound: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    approveAutomaticForeshadowRecoveries: vi.fn(),
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
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/pending-updates?review=auto-recovery-approved&approved=3&skipped=1",
    );
  });
});
