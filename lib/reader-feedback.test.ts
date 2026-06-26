import { describe, expect, it, vi } from "vitest";
import {
  buildStationCatReaderFeedbackEndpoint,
  fetchStationCatReaderFeedback,
  normalizeChapterAnalytics,
  normalizeChapterInsight,
  stationCatChapterAnalyticsPath,
} from "./reader-feedback";

describe("reader feedback", () => {
  it("builds Station Cat analytics endpoints from root or import URLs", () => {
    expect(
      buildStationCatReaderFeedbackEndpoint({
        apiBaseUrl: "https://wwwstationcat.org",
        pathPrefix: stationCatChapterAnalyticsPath,
        remoteChapterId: "chapter 1",
      }),
    ).toBe("https://wwwstationcat.org/api/analytics/chapter/chapter%201");

    expect(
      buildStationCatReaderFeedbackEndpoint({
        apiBaseUrl: "https://wwwstationcat.org/api/novelforge/import",
        pathPrefix: stationCatChapterAnalyticsPath,
        remoteChapterId: "remote_2",
      }),
    ).toBe("https://wwwstationcat.org/api/analytics/chapter/remote_2");
  });

  it("normalizes flexible analytics and insight response shapes", () => {
    expect(
      normalizeChapterAnalytics({
        data: {
          viewCount: 1200,
          likeCount: "31",
          commentCount: 4,
          completion_rate: "82%",
          avgReadSeconds: 186,
          mainDropOff: "第 4 小节节奏放慢",
          engagement_score: 8.5,
        },
      }),
    ).toMatchObject({
      views: 1200,
      likes: 31,
      comments: 4,
      completionRate: 0.82,
      averageReadSeconds: 186,
      dropOffPoint: "第 4 小节节奏放慢",
      engagementScore: 8.5,
    });

    expect(
      normalizeChapterInsight({
        insights: {
          overview: "读者对反派压迫感有反应。",
          rhythm: "中段略慢。",
          reader_focus: "罗文斌与林巧",
          hook_strategy: "下一章强化配件渠道攻防。",
          risks: ["信息解释过长"],
          character_priority: { 林巧: "提高出场权重" },
        },
      }),
    ).toMatchObject({
      summary: "读者对反派压迫感有反应。",
      pacing: "中段略慢。",
      focus: "罗文斌与林巧",
      hookStrategy: "下一章强化配件渠道攻防。",
      riskNotesJson: JSON.stringify(["信息解释过长"], null, 2),
      characterPriorityJson: JSON.stringify({ 林巧: "提高出场权重" }, null, 2),
    });
  });

  it("fetches analytics and insights with authorization and size limits", async () => {
    const fetchImpl = vi.fn(
      async (url: string | URL | Request, _init?: RequestInit) => {
      const text = String(url).includes("/insights/")
        ? JSON.stringify({ data: { summary: "继续强化追更钩子。" } })
        : JSON.stringify({ data: { views: 42, completionRate: 0.75 } });

      return new Response(text, {
        headers: {
          "content-type": "application/json",
        },
      });
      },
    );

    const result = await fetchStationCatReaderFeedback(
      {
        apiBaseUrl: "https://wwwstationcat.org",
        token: "token_123",
        remoteChapterId: "remote_chapter_1",
      },
      {
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: "Bearer token_123",
      }),
    });
    expect(result.analytics.views).toBe(42);
    expect(result.analytics.completionRate).toBe(0.75);
    expect(result.insight.summary).toBe("继续强化追更钩子。");
  });

  it("rejects oversized reader feedback JSON before reading the response body", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("{}", {
        headers: {
          "content-length": String(2 * 1024 * 1024),
        },
      }),
    );

    await expect(
      fetchStationCatReaderFeedback(
        {
          apiBaseUrl: "https://wwwstationcat.org",
          token: "token_123",
          remoteChapterId: "remote_chapter_1",
        },
        {
          fetchImpl,
        },
      ),
    ).rejects.toThrow("读者反馈响应过大");
  });
});
