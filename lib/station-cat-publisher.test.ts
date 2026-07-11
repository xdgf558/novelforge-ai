import { describe, expect, it, vi } from "vitest";
import {
  buildStationCatImportEndpoint,
  buildStationCatImportRequest,
  parseStationCatPublishResult,
  publishToStationCat,
  remoteIdForStationCatItem,
  serializeStationCatImportRequest,
  stationCatItemSucceeded,
  StationCatPublishError,
} from "./station-cat-publisher";
import {
  buildPublishSyncItems,
  buildStandardPublishPackage,
  diffPublishSyncItems,
} from "./publish-platforms";

const publishPackage = buildStandardPublishPackage(
  {
    project: {
      id: "project_1",
      title: "借命人",
      genre: "都市悬疑",
      targetAudience: "长篇连载读者",
      platform: "Station Cat",
      status: "active",
      totalWordTarget: 300000,
      description: "寿命交易背后的地下契约网络。",
    },
    chapters: [
      {
        id: "chapter_1",
        chapterNumber: 1,
        title: "第一封短信",
        status: "final",
        finalText: "短信来自一个死人。",
        wordCount: 9,
      },
    ],
    publishPackages: [
      {
        coverPrompt: "雨夜旧楼，手机冷光。",
      },
    ],
  },
  {
    generatedAt: "2026-06-18T05:00:00.000Z",
  },
);

const changedItems = diffPublishSyncItems(
  buildPublishSyncItems(publishPackage),
  [],
);

describe("station cat publisher adapter", () => {
  it("builds a stable Station Cat import request without secrets", () => {
    const request = buildStationCatImportRequest({
      publishPackage,
      changedItems,
      mode: "draft",
      onlyChanged: true,
    });
    const serialized = serializeStationCatImportRequest(request);

    expect(request.contract).toBe("station-cat-novelforge-import");
    expect(request.contractVersion).toBe(1);
    expect(request.requestId).toMatch(/^novelforge:project_1:/);
    expect(request.source).toMatchObject({
      app: "NovelForge AI",
      packageFormat: "novelforge-standard-publish-package",
      packageVersion: 1,
    });
    expect(request.changedItems[0]).toMatchObject({
      localType: "project",
      changeType: "create",
    });
    expect(request.publishPackage.cover).toMatchObject({
      prompt: "雨夜旧楼，手机冷光。",
      status: "not_generated",
    });
    expect(
      request.changedItems.find((item) => item.localType === "cover"),
    ).toMatchObject({
      localType: "cover",
      payload: {
        prompt: "雨夜旧楼，手机冷光。",
        status: "not_generated",
      },
    });
    expect(serialized).toContain('"publishPackage"');
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("secret-token");
  });

  it("keeps the idempotency key stable when only generatedAt changes", () => {
    const firstRequest = buildStationCatImportRequest({
      publishPackage,
      changedItems,
      mode: "draft",
      onlyChanged: true,
    });
    const retryRequest = buildStationCatImportRequest({
      publishPackage: {
        ...publishPackage,
        generatedAt: "2026-07-11T09:30:00.000Z",
      },
      changedItems,
      mode: "draft",
      onlyChanged: true,
    });

    expect(retryRequest.requestId).toBe(firstRequest.requestId);
  });

  it("creates a new idempotency key after a completed sync is forced again", () => {
    const firstRequest = buildStationCatImportRequest({
      publishPackage,
      changedItems: changedItems.map((item) => ({
        ...item,
        previousSyncAt: "2026-07-11T09:30:00.000Z",
      })),
      mode: "draft",
      onlyChanged: false,
    });
    const nextRequest = buildStationCatImportRequest({
      publishPackage,
      changedItems: changedItems.map((item) => ({
        ...item,
        previousSyncAt: "2026-07-11T10:30:00.000Z",
      })),
      mode: "draft",
      onlyChanged: false,
    });

    expect(nextRequest.requestId).not.toBe(firstRequest.requestId);
  });

  it("normalizes Station Cat endpoint variants", () => {
    expect(buildStationCatImportEndpoint("https://wwwstationcat.org")).toBe(
      "https://wwwstationcat.org/api/novelforge/import",
    );
    expect(
      buildStationCatImportEndpoint("https://wwwstationcat.org/api/novelforge"),
    ).toBe("https://wwwstationcat.org/api/novelforge/import");
    expect(
      buildStationCatImportEndpoint(
        "https://wwwstationcat.org/api/novelforge/import?debug=1",
      ),
    ).toBe("https://wwwstationcat.org/api/novelforge/import");
  });

  it("sends a real request with token only in the Authorization header", async () => {
    const request = buildStationCatImportRequest({
      publishPackage,
      changedItems,
      mode: "publish",
      onlyChanged: false,
      requestId: "novelforge:test-request",
    });
    const calls: {
      url: string;
      init?: RequestInit;
    }[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        init,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          remoteBookId: "work_123",
          requestId: "novelforge:test-request",
          previewUrl: "https://wwwstationcat.org/preview/work_123",
          publishUrl: "https://wwwstationcat.org/zh-hant/works/work_123",
          message: "Imported as published work.",
          remoteIds: {
            project: "work_123",
            cover: "cover_123",
          },
          items: [
            {
              localType: "chapter",
              localId: "chapter_1",
              remoteId: "chapter_remote_1",
              status: "created",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }) as typeof fetch;

    const result = await publishToStationCat(
      {
        apiBaseUrl: "https://wwwstationcat.org/api/novelforge",
        token: "secret-token",
        request,
      },
      {
        fetchImpl,
      },
    );

    expect(calls[0].url).toBe("https://wwwstationcat.org/api/novelforge/import");
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "Content-Type": "application/json",
      "X-NovelForge-Contract": "station-cat-novelforge-import.v1",
    });
    expect(String(calls[0].init?.body)).not.toContain("secret-token");
    expect(result).toMatchObject({
      ok: true,
      requestId: "novelforge:test-request",
      remoteBookId: "work_123",
      remoteIds: {
        project: "work_123",
        cover: "cover_123",
      },
      publishUrl: "https://wwwstationcat.org/zh-hant/works/work_123",
    });
    expect(result.items[0]).toMatchObject({
      localId: "chapter_1",
      remoteId: "chapter_remote_1",
      status: "created",
    });
  });

  it("normalizes error responses for the real client", async () => {
    const request = buildStationCatImportRequest({
      publishPackage,
      changedItems,
      mode: "draft",
      onlyChanged: true,
    });
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "NOVELFORGE_TOKEN_INVALID",
            message: "Invalid publish token.",
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )) as typeof fetch;

    await expect(
      publishToStationCat(
        {
          apiBaseUrl: "https://wwwstationcat.org",
          token: "bad-token",
          request,
        },
        {
          fetchImpl,
        },
      ),
    ).rejects.toMatchObject({
      name: "StationCatPublishError",
      statusCode: 401,
      message: "NOVELFORGE_TOKEN_INVALID: Invalid publish token.",
    } satisfies Partial<StationCatPublishError>);
  });

  it("adds endpoint, payload size, and network cause to fetch failures", async () => {
    const request = buildStationCatImportRequest({
      publishPackage,
      changedItems,
      mode: "draft",
      onlyChanged: true,
    });
    const fetchError = Object.assign(new Error("fetch failed"), {
      cause: {
        code: "ENOTFOUND",
        message: "getaddrinfo ENOTFOUND wwwstationcat.org",
      },
    });
    const fetchImpl = vi.fn(async () => {
      throw fetchError;
    });
    let thrownError: unknown;

    try {
      await publishToStationCat(
        {
          apiBaseUrl: "https://wwwstationcat.org",
          token: "secret-token",
          request,
        },
        {
          fetchImpl,
        },
      );
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toContain(
      "Station Cat 接口请求未收到响应：https://wwwstationcat.org/api/novelforge/import",
    );
    expect((thrownError as Error).message).toContain("请求体约");
    expect((thrownError as Error).message).toContain(
      "ENOTFOUND getaddrinfo ENOTFOUND wwwstationcat.org",
    );
    expect((thrownError as Error).message).toContain("DNS 解析失败");
  });

  it("parses snake_case response aliases and remote id mapping", () => {
    const parsed = parseStationCatPublishResult({
      success: true,
      request_id: "novelforge:test",
      workId: "work_456",
      preview_url: "https://wwwstationcat.org/preview/work_456",
      publish_url: "https://wwwstationcat.org/zh-hant/works/work_456",
      remote_ids: {
        project: "work_456",
        cover: "cover_456",
      },
      changedItems: [
        {
          local_type: "project",
          local_id: "project_1",
          remote_id: "work_456",
          status: "updated",
          detail: "metadata synced",
        },
      ],
    });
    expect(parsed).toMatchObject({
      ok: true,
      requestId: "novelforge:test",
      remoteBookId: "work_456",
      remoteIds: {
        project: "work_456",
        cover: "cover_456",
      },
      previewUrl: "https://wwwstationcat.org/preview/work_456",
      publishUrl: "https://wwwstationcat.org/zh-hant/works/work_456",
    });
    expect(parsed.items[0]).toMatchObject({
      localType: "project",
      localId: "project_1",
      remoteId: "work_456",
      status: "updated",
      message: "metadata synced",
    });
    expect(
      remoteIdForStationCatItem(parsed, {
        localType: "project",
        localId: "project_1",
      }),
    ).toBe("work_456");
    expect(
      remoteIdForStationCatItem(parsed, {
        localType: "cover",
        localId: "project_1:cover",
      }),
    ).toBe("cover_456");
    expect(
      stationCatItemSucceeded(parsed, {
        localType: "project",
        localId: "project_1",
      }),
    ).toBe(true);
  });
});
