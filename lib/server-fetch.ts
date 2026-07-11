import { Agent, ProxyAgent, type Dispatcher } from "undici";
import { getAiRuntimeEnv, type AiRuntimeEnv } from "@/lib/ai/local-config";

type FetchWithDispatcherInit = RequestInit & {
  dispatcher?: Dispatcher;
};

type FetchLike = typeof fetch;

type ServerFetchOptions = {
  callerTimeoutMs?: number;
};

export const serverFetchTransportTimeoutGraceMs = 30_000;

const cachedDispatchers = new Map<string, Dispatcher>();

export function createServerFetch(
  env: AiRuntimeEnv = process.env,
  options: ServerFetchOptions = {},
): FetchLike {
  const proxyConfig = getProxyConfig(env);
  const transportTimeoutMs = resolveTransportTimeoutMs(options.callerTimeoutMs);

  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const proxyDispatcher = getProxyDispatcherForRequest(
      input,
      proxyConfig,
      transportTimeoutMs,
    );

    if (!proxyDispatcher) {
      const directDispatcher = getDirectDispatcher(transportTimeoutMs);

      if (!directDispatcher) {
        return fetch(input, init);
      }

      return fetch(input, {
        ...init,
        dispatcher: directDispatcher,
      } as FetchWithDispatcherInit);
    }

    const { signal, ...initWithoutSignal } = init ?? {};
    const responsePromise = fetch(input, {
      ...initWithoutSignal,
      dispatcher: proxyDispatcher,
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

export function getDefaultProxyDispatcher(env: AiRuntimeEnv = process.env) {
  const proxyConfig = getProxyConfig(env);
  // This default dispatcher is only for callers that do not have a concrete
  // request URL. Request-aware fetch paths must use getProxyDispatcherForRequest.
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

function getDirectDispatcher(transportTimeoutMs?: number) {
  if (!transportTimeoutMs) {
    return null;
  }

  const directKey = JSON.stringify({
    kind: "direct",
    transportTimeoutMs,
  });
  const cachedDispatcher = cachedDispatchers.get(directKey);

  if (cachedDispatcher) {
    return cachedDispatcher;
  }

  const dispatcher = new Agent({
    headersTimeout: transportTimeoutMs,
    bodyTimeout: transportTimeoutMs,
  });
  cachedDispatchers.set(directKey, dispatcher);

  return dispatcher;
}

function getProxyDispatcherForUrl(
  proxyUrl: string,
  noProxy: string,
  transportTimeoutMs?: number,
) {
  const proxyKey = JSON.stringify({
    kind: "proxy",
    proxyUrl,
    noProxy,
    transportTimeoutMs,
  });
  const cachedDispatcher = cachedDispatchers.get(proxyKey);

  if (cachedDispatcher) {
    return cachedDispatcher;
  }

  const dispatcher = new ProxyAgent({
    uri: proxyUrl,
    ...(transportTimeoutMs
      ? {
          headersTimeout: transportTimeoutMs,
          bodyTimeout: transportTimeoutMs,
        }
      : {}),
  });
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
  transportTimeoutMs?: number,
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

  return getProxyDispatcherForUrl(
    proxyUrl,
    proxyConfig.noProxy,
    transportTimeoutMs,
  );
}

function resolveTransportTimeoutMs(callerTimeoutMs?: number) {
  if (
    typeof callerTimeoutMs !== "number" ||
    !Number.isFinite(callerTimeoutMs) ||
    callerTimeoutMs <= 0
  ) {
    return undefined;
  }

  return Math.round(callerTimeoutMs) + serverFetchTransportTimeoutGraceMs;
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
