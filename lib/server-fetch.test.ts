import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerFetch } from "./server-fetch";

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe("server fetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not pass abort signals directly into proxied undici fetch calls", async () => {
    const fetchSpy = vi.fn<FetchMock>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchSpy);

    const fetchImpl = createServerFetch({
      HTTPS_PROXY: "http://127.0.0.1:1082",
      NO_PROXY: "localhost,127.0.0.1,::1",
    });
    const abortController = new AbortController();
    const response = await fetchImpl("https://api.ppq.ai/v1/audio/voices", {
      signal: abortController.signal,
    });
    const init = fetchSpy.mock.calls[0]?.[1] as
      | (RequestInit & { dispatcher?: unknown })
      | undefined;

    expect(await response.text()).toBe("ok");
    expect(init?.dispatcher).toBeTruthy();
    expect(init?.signal).toBeUndefined();
  });

  it("keeps caller-side abort semantics for proxied requests", async () => {
    const fetchSpy = vi.fn<FetchMock>(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchSpy);

    const fetchImpl = createServerFetch({
      HTTPS_PROXY: "http://127.0.0.1:1082",
      NO_PROXY: "localhost,127.0.0.1,::1",
    });
    const abortController = new AbortController();
    const requestPromise = fetchImpl("https://api.ppq.ai/v1/audio/voices", {
      signal: abortController.signal,
    });

    abortController.abort();

    await expect(requestPromise).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
