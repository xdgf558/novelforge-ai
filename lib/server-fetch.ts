import { EnvHttpProxyAgent, type Dispatcher } from "undici";
import { getAiRuntimeEnv, type AiRuntimeEnv } from "@/lib/ai/local-config";

type FetchWithDispatcherInit = RequestInit & {
  dispatcher?: Dispatcher;
};

type FetchLike = typeof fetch;

let cachedProxyKey = "";
let cachedDispatcher: Dispatcher | null = null;

export function createServerFetch(env: AiRuntimeEnv = process.env): FetchLike {
  const dispatcher = getProxyDispatcher(env);

  if (!dispatcher) {
    return fetch;
  }

  return ((input: RequestInfo | URL, init?: RequestInit) => {
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
  const runtimeEnv = getAiRuntimeEnv(env);
  const httpProxy = firstValue(runtimeEnv.http_proxy, runtimeEnv.HTTP_PROXY);
  const httpsProxy = firstValue(runtimeEnv.https_proxy, runtimeEnv.HTTPS_PROXY);
  const noProxy = firstValue(runtimeEnv.no_proxy, runtimeEnv.NO_PROXY);
  const allProxy = firstValue(runtimeEnv.all_proxy, runtimeEnv.ALL_PROXY);
  const proxyKey = JSON.stringify({
    allProxy,
    httpProxy,
    httpsProxy,
    noProxy,
  });

  if (!allProxy && !httpProxy && !httpsProxy) {
    cachedProxyKey = "";
    cachedDispatcher = null;
    return null;
  }

  if (cachedDispatcher && cachedProxyKey === proxyKey) {
    return cachedDispatcher;
  }

  cachedProxyKey = proxyKey;
  cachedDispatcher = new EnvHttpProxyAgent({
    httpProxy: httpProxy || allProxy || undefined,
    httpsProxy: httpsProxy || allProxy || httpProxy || undefined,
    noProxy: noProxy || undefined,
  });

  return cachedDispatcher;
}

function firstValue(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || "";
}
