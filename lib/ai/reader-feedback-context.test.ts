import { describe, expect, it } from "vitest";
import {
  buildReaderFeedbackSignals,
  formatReaderFeedbackSignals,
  readerFeedbackSignalsToJson,
} from "./reader-feedback-context";

describe("reader feedback generation context", () => {
  it("compresses latest analytics and insight snapshots into generation signals", () => {
    const signals = buildReaderFeedbackSignals([
      {
        chapterNumber: 3,
        title: "罗文斌的警告",
        readerAnalytics: [
          {
            fetchedAt: new Date("2026-06-25T10:00:00.000Z"),
            views: 1280,
            likes: 42,
            comments: 8,
            favorites: 21,
            shares: 5,
            completionRate: 0.786,
            averageReadSeconds: 312,
            dropOffPoint: "中段解释货源链路时流失明显。",
            engagementScore: 73,
          },
        ],
        readerInsights: [
          {
            fetchedAt: new Date("2026-06-25T11:00:00.000Z"),
            summary: "读者认可压迫感，但希望下一章更快进入反击。",
            pacing: "开场可以更快。",
            focus: "林巧和谢勇的行动权重需要提高。",
            hookStrategy: "章末保留罗文斌升级施压的明确信号。",
            riskNotesJson: JSON.stringify(["技术解释偏长", "反派压迫需有回击"]),
            characterPriorityJson: JSON.stringify({
              林巧: "继续提供情报，但不要过度神化",
              谢勇: "承担跑腿和地面执行",
            }),
          },
        ],
      },
      {
        chapterNumber: 2,
        title: "谢勇出场",
        readerAnalytics: [],
        readerInsights: [],
      },
    ]);

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      chapterNumber: 3,
      title: "罗文斌的警告",
      views: 1280,
      completionRate: 0.786,
      engagementScore: 73,
      summary: "读者认可压迫感，但希望下一章更快进入反击。",
      riskNotes: "技术解释偏长；反派压迫需有回击",
    });
    expect(signals[0].fetchedAt?.toISOString()).toBe(
      "2026-06-25T11:00:00.000Z",
    );
  });

  it("formats signals for prompt text and serializes bounded json", () => {
    const signals = buildReaderFeedbackSignals([
      {
        chapterNumber: 4,
        title: "第一堂课",
        readerAnalytics: [
          {
            fetchedAt: new Date("2026-06-25T12:00:00.000Z"),
            views: 2000,
            likes: 100,
            comments: 12,
            favorites: 40,
            shares: 9,
            completionRate: 0.91,
            averageReadSeconds: 420,
            dropOffPoint: "课堂后半段节奏放缓。",
            engagementScore: 88,
          },
        ],
      },
    ]);

    expect(formatReaderFeedbackSignals(signals)).toContain("完成率 91%");
    expect(formatReaderFeedbackSignals(signals)).toContain("均读时长 7分");
    expect(readerFeedbackSignalsToJson(signals)).toEqual([
      expect.objectContaining({
        chapterNumber: 4,
        title: "第一堂课",
        metrics: expect.objectContaining({
          views: 2000,
          completionRate: 0.91,
          engagementScore: 88,
        }),
        dropOffPoint: "课堂后半段节奏放缓。",
      }),
    ]);
  });
});
