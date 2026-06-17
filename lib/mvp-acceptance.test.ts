import { describe, expect, it } from "vitest";
import { buildMvpAcceptanceReport } from "./mvp-acceptance";

const completedCoreTasks = [
  "project_setting_generation",
  "chapter_beat_generation",
  "chapter_draft_generation",
  "chapter_summary_extraction",
  "pending_update_extraction",
  "continuity_check",
  "wechat_publish_packaging",
].map((taskType) => ({ taskType, status: "completed" }));

describe("MVP acceptance report", () => {
  it("marks a complete local MVP project as accepted", () => {
    const report = buildMvpAcceptanceReport({
      project: {
        id: "project_1",
        title: "借命人",
      },
      setting: {
        genre: "都市悬疑",
        sellingPoint: "寿命交易反转。",
      },
      characters: ["a", "b", "c", "d", "e"],
      chapters: [
        {
          chapterNumber: 1,
          beats: "1. 收到短信。",
          draftText: "草稿正文。",
          finalText: "定稿正文。",
        },
      ],
      aiTasks: completedCoreTasks,
      pendingUpdates: [{ status: "applied" }, { status: "rejected" }],
      continuityReports: [{ id: "report_1" }],
      publishPackages: [{ id: "package_1" }],
      exportFormats: {
        markdown: true,
        json: true,
      },
      persistedAfterReconnect: true,
    });

    expect(report.isComplete).toBe(true);
    expect(report.passedCount).toBe(report.totalCount);
    expect(report.completionPercent).toBe(100);
  });

  it("keeps missing requirements actionable", () => {
    const report = buildMvpAcceptanceReport({
      project: {
        id: "project_1",
        title: "未完成项目",
      },
      setting: null,
      characters: ["a"],
      chapters: [
        {
          chapterNumber: 1,
        },
      ],
      aiTasks: [],
      pendingUpdates: [],
      continuityReports: [],
      publishPackages: [],
    });
    const failed = report.checks.filter((check) => !check.passed);

    expect(report.isComplete).toBe(false);
    expect(failed.map((check) => check.id)).toContain("setting_saved");
    expect(failed.map((check) => check.id)).toContain("five_characters");
    expect(failed.map((check) => check.id)).toContain("ai_calls_logged");
    expect(
      failed.find((check) => check.id === "ai_calls_logged")?.evidence,
    ).toContain("project_setting_generation");
    expect(failed.every((check) => check.actionHint.length > 0)).toBe(true);
  });
});
