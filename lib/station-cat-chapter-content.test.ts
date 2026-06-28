import { describe, expect, it, vi } from "vitest";
import {
  buildStationCatChapterContentEndpoint,
  fetchStationCatPublishedChapterContent,
  parsePublishedChapterContent,
} from "./station-cat-chapter-content";

describe("Station Cat published chapter content", () => {
  it("builds the NovelForge chapter content endpoint", () => {
    expect(
      buildStationCatChapterContentEndpoint(
        "https://wwwstationcat.org",
        "chapter remote/1",
      ),
    ).toBe(
      "https://wwwstationcat.org/api/novelforge/chapters/chapter%20remote%2F1/content",
    );

    expect(
      buildStationCatChapterContentEndpoint(
        "https://wwwstationcat.org/api/novelforge",
        "remote_1",
      ),
    ).toBe(
      "https://wwwstationcat.org/api/novelforge/chapters/remote_1/content",
    );

    expect(
      buildStationCatChapterContentEndpoint(
        "https://wwwstationcat.org/api/novelforge/import",
        "remote_1",
      ),
    ).toBe(
      "https://wwwstationcat.org/api/novelforge/chapters/remote_1/content",
    );
  });

  it("parses published body from flexible response shapes", () => {
    expect(
      parsePublishedChapterContent(
        {
          data: {
            body: "网站最终正文",
            id: "remote_1",
            status: "published",
            title: "第一章",
          },
        },
        "remote_1",
      ),
    ).toMatchObject({
      body: "网站最终正文",
      remoteId: "remote_1",
      title: "第一章",
    });
  });

  it("rejects non-public chapter statuses", () => {
    expect(() =>
      parsePublishedChapterContent(
        {
          chapter: {
            body: "草稿正文",
            status: "draft",
          },
        },
        "remote_1",
      ),
    ).toThrow("不是公开发布状态");
  });

  it("fetches content with the publish token", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          chapter: {
            content: "网站后台修改后的正文",
            id: "remote_1",
            status: "published",
          },
        }),
        {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        },
      ),
    );

    const content = await fetchStationCatPublishedChapterContent(
      {
        apiBaseUrl: "https://wwwstationcat.org",
        remoteChapterId: "remote_1",
        token: "publish-token",
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://wwwstationcat.org/api/novelforge/chapters/remote_1/content",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer publish-token",
        }),
        method: "GET",
      }),
    );
    expect(content.body).toBe("网站后台修改后的正文");
  });
});
