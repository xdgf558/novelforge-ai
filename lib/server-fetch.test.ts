import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerFetch, resetServerFetchProxyDispatcher } from "./server-fetch";

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type FetchInitWithDispatcher = RequestInit & { dispatcher?: unknown };

function fetchInitAt(fetchSpy: ReturnType<typeof vi.fn<FetchMock>>, index: number) {
  return fetchSpy.mock.calls[index]?.[1] as FetchInitWithDispatcher | undefined;
}

describe("server fetch", () => {
  afterEach(() => {
    resetServerFetchProxyDispatcher();
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
    const init = fetchInitAt(fetchSpy, 0);

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

  it("uses protocol-specific proxy dispatchers when HTTP and HTTPS proxies differ", async () => {
    const fetchSpy = vi.fn<FetchMock>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchSpy);

    const fetchImpl = createServerFetch({
      HTTP_PROXY: "http://127.0.0.1:1081",
      HTTPS_PROXY: "http://127.0.0.1:1082",
    });

    await fetchImpl("http://example.com/plain");
    await fetchImpl("https://example.com/secure");

    const httpDispatcher = fetchInitAt(fetchSpy, 0)?.dispatcher;
    const httpsDispatcher = fetchInitAt(fetchSpy, 1)?.dispatcher;

    expect(httpDispatcher).toBeTruthy();
    expect(httpsDispatcher).toBeTruthy();
    expect(httpDispatcher).not.toBe(httpsDispatcher);
  });

  it("does not use HTTPS_PROXY for HTTP requests when no HTTP or ALL proxy exists", async () => {
    const fetchSpy = vi.fn<FetchMock>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchSpy);

    const fetchImpl = createServerFetch({
      HTTPS_PROXY: "http://127.0.0.1:1082",
    });

    await fetchImpl("http://example.com/plain");

    expect(fetchInitAt(fetchSpy, 0)?.dispatcher).toBeUndefined();
  });

  it("does not use HTTP_PROXY for HTTPS requests when no HTTPS or ALL proxy exists", async () => {
    const fetchSpy = vi.fn<FetchMock>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchSpy);

    const fetchImpl = createServerFetch({
      HTTP_PROXY: "http://127.0.0.1:1081",
    });

    await fetchImpl("https://example.com/secure");

    expect(fetchInitAt(fetchSpy, 0)?.dispatcher).toBeUndefined();
  });

  it("uses ALL_PROXY as a fallback for URL and Request inputs", async () => {
    const fetchSpy = vi.fn<FetchMock>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchSpy);

    const fetchImpl = createServerFetch({
      ALL_PROXY: "http://127.0.0.1:1080",
    });

    await fetchImpl(new URL("http://example.com/plain"));
    await fetchImpl(new Request("https://example.com/secure"));

    const urlDispatcher = fetchInitAt(fetchSpy, 0)?.dispatcher;
    const requestDispatcher = fetchInitAt(fetchSpy, 1)?.dispatcher;

    expect(urlDispatcher).toBeTruthy();
    expect(requestDispatcher).toBeTruthy();
    expect(urlDispatcher).toBe(requestDispatcher);
  });

  it("bypasses proxies when NO_PROXY matches the request host", async () => {
    const fetchSpy = vi.fn<FetchMock>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchSpy);

    const fetchImpl = createServerFetch({
      HTTPS_PROXY: "http://127.0.0.1:1082",
      NO_PROXY: "api.ppq.ai",
    });

    await fetchImpl("https://api.ppq.ai/v1/audio/voices");

    expect(fetchInitAt(fetchSpy, 0)?.dispatcher).toBeUndefined();
  });

  it("bypasses proxies when NO_PROXY wildcard is configured", async () => {
    const fetchSpy = vi.fn<FetchMock>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchSpy);

    const fetchImpl = createServerFetch({
      HTTP_PROXY: "http://127.0.0.1:1081",
      HTTPS_PROXY: "http://127.0.0.1:1082",
      NO_PROXY: "*",
    });

    await fetchImpl("https://api.ppq.ai/v1/audio/voices");

    expect(fetchInitAt(fetchSpy, 0)?.dispatcher).toBeUndefined();
  });
});
