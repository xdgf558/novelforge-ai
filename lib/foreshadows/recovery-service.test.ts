import { beforeEach, describe, expect, it, vi } from "vitest";

import { chapterFinalTextHash } from "@/lib/chapters/source-text";
import {
  loadHistoricalForeshadowRecoveryAuditBatches,
  startHistoricalForeshadowRecoveryAudit,
} from "./recovery-service";

const mocks = vi.hoisted(() => ({
  ensureDefaultPromptTemplate: vi.fn(),
  persistAutomaticForeshadowRecoverySuggestions: vi.fn(),
  startLoggedOpenAITextTask: vi.fn(),
  prisma: {
    aiTask: {
      findFirst: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    foreshadow: {
      findMany: vi.fn(),
    },
    chapter: {
      findMany: vi.fn(),
    },
    chapterSummary: {
      findMany: vi.fn(),
    },
    pendingUpdate: {
      findMany: vi.fn(),
    },
  },
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

vi.mock("./recovery-records", () => ({
  persistAutomaticForeshadowRecoverySuggestions:
    mocks.persistAutomaticForeshadowRecoverySuggestions,
}));

describe("historical foreshadow recovery audit batches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);
    mocks.prisma.project.findUnique.mockResolvedValue({ title: "照夜寒舟录" });
    mocks.prisma.chapter.findMany.mockResolvedValue([
      {
        id: "chapter_15",
        chapterNumber: 15,
        title: "桑宅夜窟",
        finalText: "沈照夜在桑宅地窖找到了新证据。",
      },
    ]);
    mocks.prisma.chapterSummary.findMany.mockResolvedValue([]);
    mocks.prisma.pendingUpdate.findMany.mockResolvedValue([]);
    mocks.ensureDefaultPromptTemplate.mockResolvedValue({
      id: "template_1",
      taskType: "foreshadow_recovery_audit",
      systemPrompt: "system",
      userPrompt: "user",
      contextNotes: "notes",
      responseSchema: "{}",
    });
    mocks.startLoggedOpenAITextTask.mockResolvedValue({ id: "task_running" });
    mocks.persistAutomaticForeshadowRecoverySuggestions.mockResolvedValue(1);
  });

  it("keeps every old unresolved foreshadow and splits a large pool into bounded batches", async () => {
    mocks.prisma.foreshadow.findMany.mockResolvedValue(
      Array.from({ length: 46 }, (_, index) => ({
        id: `foreshadow_${index + 1}`,
        content: `第 ${index + 1} 条历史伏笔。`,
        status: "planted",
        importance: index % 3 === 0 ? "high" : "medium",
        expectedResolveChapter: index + 1,
        plantedChapterId: "chapter_1",
        plantedChapter: {
          chapterNumber: 1,
        },
      })),
    );

    const result = await loadHistoricalForeshadowRecoveryAuditBatches("project_1");

    expect(result?.batches.map((batch) => batch.foreshadows.length)).toEqual([
      12, 12, 12, 10,
    ]);
    expect(
      result?.batches.flatMap((batch) => batch.foreshadows).map((item) => item.id),
    ).toHaveLength(46);
    expect(mocks.prisma.foreshadow.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ take: expect.anything() }),
    );
  });

  it("skips targets already awaiting review and ignores summaries for stale final text", async () => {
    const finalText = "本章明确找到了裴仲明留下的平面图。";

    mocks.prisma.foreshadow.findMany.mockResolvedValue([
      {
        id: "foreshadow_pending",
        content: "已有待审核项。",
        status: "planted",
        importance: "high",
        expectedResolveChapter: 15,
        plantedChapterId: "chapter_1",
        plantedChapter: { chapterNumber: 1 },
      },
      {
        id: "foreshadow_scan",
        content: "裴仲明在夹层留下平面图。",
        status: "planted",
        importance: "high",
        expectedResolveChapter: 15,
        plantedChapterId: "chapter_1",
        plantedChapter: { chapterNumber: 1 },
      },
    ]);
    mocks.prisma.chapter.findMany.mockResolvedValue([
      {
        id: "chapter_15",
        chapterNumber: 15,
        title: "桑宅夜窟",
        finalText,
      },
    ]);
    mocks.prisma.chapterSummary.findMany.mockResolvedValue([
      {
        id: "summary_stale",
        chapterId: "chapter_15",
        outputText: JSON.stringify({ shortSummary: "过期摘要内容" }),
        sourceTextHash: chapterFinalTextHash("旧定稿"),
        createdAt: new Date("2026-07-10T00:00:00.000Z"),
      },
    ]);
    mocks.prisma.pendingUpdate.findMany.mockResolvedValue([
      { targetId: "foreshadow_pending" },
    ]);

    const result = await loadHistoricalForeshadowRecoveryAuditBatches("project_1");

    expect(result?.batches).toHaveLength(1);
    expect(result?.batches[0]?.foreshadows.map((item) => item.id)).toEqual([
      "foreshadow_scan",
    ]);
    expect(result?.batches[0]?.chapters[0]?.summary).toBe(finalText);
    expect(result?.batches[0]?.chapters[0]?.summary).not.toContain("过期摘要");
  });

  it("keeps an old expected recovery chapter when the novel exceeds the evidence limit", async () => {
    mocks.prisma.foreshadow.findMany.mockResolvedValue([
      {
        id: "foreshadow_old",
        content: "早期埋下的无相关关键词伏笔。",
        status: "planted",
        importance: "high",
        expectedResolveChapter: 5,
        plantedChapterId: "chapter_1",
        plantedChapter: { chapterNumber: 1 },
      },
    ]);
    mocks.prisma.chapter.findMany.mockResolvedValue(
      Array.from({ length: 40 }, (_, index) => ({
        id: `chapter_${index + 1}`,
        chapterNumber: index + 1,
        title: `第 ${index + 1} 章`,
        finalText: `这是第 ${index + 1} 章的正式正文。`,
      })),
    );

    const result = await loadHistoricalForeshadowRecoveryAuditBatches("project_1");
    const evidenceChapterNumbers =
      result?.batches[0]?.chapters.map((chapter) => chapter.chapterNumber) ?? [];

    expect(evidenceChapterNumbers).toHaveLength(24);
    expect(evidenceChapterNumbers).toContain(5);
    expect(evidenceChapterNumbers).toContain(40);
  });

  it("starts historical batches one at a time and continues after a failed batch", async () => {
    mocks.prisma.foreshadow.findMany.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => ({
        id: `foreshadow_${index + 1}`,
        content: `第 ${index + 1} 条伏笔。`,
        status: "planted",
        importance: "medium",
        expectedResolveChapter: null,
        plantedChapterId: "chapter_1",
        plantedChapter: { chapterNumber: 1 },
      })),
    );

    await expect(
      startHistoricalForeshadowRecoveryAudit("project_1"),
    ).resolves.toEqual({
      status: "started",
      batchCount: 3,
      foreshadowCount: 25,
    });
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledTimes(1);

    const firstOptions = mocks.startLoggedOpenAITextTask.mock.calls[0]?.[2] as {
      onCompleted: (task: { id: string; outputText: string }) => Promise<void>;
    };
    await firstOptions.onCompleted({ id: "task_1", outputText: "{}" });
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledTimes(2);

    const secondOptions = mocks.startLoggedOpenAITextTask.mock.calls[1]?.[2] as {
      onFailed: () => Promise<void>;
    };
    await secondOptions.onFailed();
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledTimes(3);

    const thirdOptions = mocks.startLoggedOpenAITextTask.mock.calls[2]?.[2] as {
      onCompleted: (task: { id: string; outputText: string }) => Promise<void>;
    };
    await thirdOptions.onCompleted({ id: "task_3", outputText: "{}" });
    expect(mocks.startLoggedOpenAITextTask).toHaveBeenCalledTimes(3);
    expect(
      mocks.persistAutomaticForeshadowRecoverySuggestions,
    ).toHaveBeenCalledTimes(2);
  });
});
