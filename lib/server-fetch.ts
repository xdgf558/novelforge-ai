import { ProxyAgent, type Dispatcher } from "undici";
import { getAiRuntimeEnv, type AiRuntimeEnv } from "@/lib/ai/local-config";

type FetchWithDispatcherInit = RequestInit & {
  dispatcher?: Dispatcher;
};

type FetchLike = typeof fetch;

const cachedDispatchers = new Map<string, Dispatcher>();

export function createServerFetch(env: AiRuntimeEnv = process.env): FetchLike {
  const proxyConfig = getProxyConfig(env);

  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const dispatcher = getProxyDispatcherForRequest(input, proxyConfig);

    if (!dispatcher) {
      return fetch(input, init);
    }

    const { signal, ...initWithoutSignal } = init ?? {};
    const responsePromise = fetch(input, {
      ...initWithoutSignal,
      dispatcher,
    } as FetchWithDispatcherInit);

    if (!signal) {
      return responsePromise;
    }

    if (signal.aborted) {
      return Promise.reject(createAbortError());
    }

    return new Promise<Response>((resolve, reject) => {
      const handleAbort = () => reject(createAbortError());
      signal.addEventListener("abort", handleAbort, { once: true });

      responsePromise
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", handleAbort));
    });
  }) as FetchLike;
}

function createAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("This operation was aborted.", "AbortError");
  }

  const error = new Error("This operation was aborted.");
  error.name = "AbortError";
  return error;
}

export function getProxyDispatcher(env: AiRuntimeEnv = process.env) {
  const proxyConfig = getProxyConfig(env);
  const proxyUrl = firstValue(
    proxyConfig.httpsProxy,
    proxyConfig.allProxy,
    proxyConfig.httpProxy,
  );

  if (!proxyUrl) {
    cachedDispatchers.clear();
    return null;
  }

  return getProxyDispatcherForUrl(proxyUrl, proxyConfig.noProxy);
}

function getProxyDispatcherForUrl(proxyUrl: string, noProxy: string) {
  const proxyKey = JSON.stringify({ proxyUrl, noProxy });
  const cachedDispatcher = cachedDispatchers.get(proxyKey);

  if (cachedDispatcher) {
    return cachedDispatcher;
  }

  const dispatcher = new ProxyAgent(proxyUrl);
  cachedDispatchers.set(proxyKey, dispatcher);

  return dispatcher;
}

export function resetServerFetchProxyDispatcher() {
  cachedDispatchers.clear();
}

function firstValue(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || "";
}

type ProxyConfig = {
  allProxy: string;
  httpProxy: string;
  httpsProxy: string;
  noProxy: string;
};

function getProxyConfig(env: AiRuntimeEnv = process.env): ProxyConfig {
  const runtimeEnv = getAiRuntimeEnv(env);

  return {
    allProxy: firstValue(runtimeEnv.all_proxy, runtimeEnv.ALL_PROXY),
    httpProxy: firstValue(runtimeEnv.http_proxy, runtimeEnv.HTTP_PROXY),
    httpsProxy: firstValue(runtimeEnv.https_proxy, runtimeEnv.HTTPS_PROXY),
    noProxy: firstValue(runtimeEnv.no_proxy, runtimeEnv.NO_PROXY),
  };
}

function getProxyDispatcherForRequest(
  input: RequestInfo | URL,
  proxyConfig: ProxyConfig,
) {
  if (shouldBypassProxy(input, proxyConfig.noProxy)) {
    return null;
  }

  const protocol = requestProtocol(input);
  const proxyUrl =
    protocol === "http:"
      ? firstValue(proxyConfig.httpProxy, proxyConfig.allProxy)
      : firstValue(proxyConfig.httpsProxy, proxyConfig.allProxy);

  if (!proxyUrl) {
    return null;
  }

  return getProxyDispatcherForUrl(proxyUrl, proxyConfig.noProxy);
}

function shouldBypassProxy(input: RequestInfo | URL, noProxy: string) {
  const hostname = requestHostname(input);

  if (!hostname || !noProxy.trim()) {
    return false;
  }

  return noProxy
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => noProxyEntryMatches(hostname, entry));
}

function noProxyEntryMatches(hostname: string, entry: string) {
  const normalizedHostname = hostname.toLowerCase();

  if (entry === "*") {
    return true;
  }

  if (entry.startsWith(".")) {
    return normalizedHostname.endsWith(entry);
  }

  return normalizedHostname === entry || normalizedHostname.endsWith(`.${entry}`);
}

function requestHostname(input: RequestInfo | URL) {
  try {
    if (input instanceof URL) {
      return input.hostname;
    }

    if (typeof input === "string") {
      return new URL(input).hostname;
    }

    return new URL(input.url).hostname;
  } catch {
    return "";
  }
}

function requestProtocol(input: RequestInfo | URL) {
  try {
    if (input instanceof URL) {
      return input.protocol;
    }

    if (typeof input === "string") {
      return new URL(input).protocol;
    }

    return new URL(input.url).protocol;
  } catch {
    return "https:";
  }
}
