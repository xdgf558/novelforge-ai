import { describe, expect, it, vi } from "vitest";
import {
  buildOpenAIChatCompletionsPayload,
  buildOpenAIInputMessages,
  buildOpenAIResponsesPayload,
  createOpenAITextResponse,
  defaultOpenAIRequestTimeoutMs,
  extractOpenAIOutputText,
  extractOpenAIUsage,
  getConfiguredOpenAIBaseUrl,
  getConfiguredOpenAIModel,
  hasConfiguredOpenAIKey,
} from "./openai-client";

describe("OpenAI client helpers", () => {
  it("uses configured model with a stable local fallback", () => {
    expect(getConfiguredOpenAIModel({ OPENAI_MODEL: "gpt-test", OPENAI_API_KEY: "" })).toBe(
      "gpt-test",
    );
    expect(getConfiguredOpenAIModel({ OPENAI_MODEL: "", OPENAI_API_KEY: "" })).toBe(
      "gpt-4.1-mini",
    );
  });

  it("uses a custom OpenAI-compatible base URL", () => {
    expect(
      getConfiguredOpenAIBaseUrl({
        OPENAI_BASE_URL: "https://api.example.com/v1/",
        OPENAI_MODEL: "",
        OPENAI_API_KEY: "",
      }),
    ).toBe("https://api.example.com/v1");
  });

  it("detects whether the server has an API key", () => {
    expect(hasConfiguredOpenAIKey({ OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "" })).toBe(
      true,
    );
    expect(hasConfiguredOpenAIKey({ OPENAI_API_KEY: "   ", OPENAI_MODEL: "" })).toBe(
      false,
    );
  });

  it("builds Responses API text input messages", () => {
    expect(
      buildOpenAIInputMessages({
        systemPrompt: "系统",
        developerPrompt: "开发者",
        input: "用户输入",
      }),
    ).toEqual([
      {
        role: "system",
        content: [{ type: "input_text", text: "系统" }],
      },
      {
        role: "developer",
        content: [{ type: "input_text", text: "开发者" }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: "用户输入" }],
      },
    ]);
  });

  it("builds a Responses API payload without exposing any API key", () => {
    expect(
      buildOpenAIResponsesPayload({
        model: "gpt-test",
        input: "生成章节节拍",
      }),
    ).toEqual({
      model: "gpt-test",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: "生成章节节拍" }],
        },
      ],
    });
  });

  it("builds a Chat Completions payload for OpenAI-compatible providers", () => {
    expect(
      buildOpenAIChatCompletionsPayload({
        model: "deepseek-v4-pro",
        systemPrompt: "系统",
        developerPrompt: "开发者",
        input: "生成章节节拍",
      }),
    ).toEqual({
      model: "deepseek-v4-pro",
      messages: [
        {
          role: "system",
          content: "系统\n\n开发者",
        },
        {
          role: "user",
          content: "生成章节节拍",
        },
      ],
    });
  });

  it("adds K3 max reasoning effort without changing K2.6 payloads", () => {
    expect(
      buildOpenAIChatCompletionsPayload({
        model: "kimi-k3",
        input: "深度精修章节",
      }),
    ).toEqual({
      model: "kimi-k3",
      messages: [{ role: "user", content: "深度精修章节" }],
      reasoning_effort: "max",
    });
    expect(
      buildOpenAIChatCompletionsPayload({
        model: "kimi-k2.6",
        input: "生成章节草稿",
      }),
    ).toEqual({
      model: "kimi-k2.6",
      messages: [{ role: "user", content: "生成章节草稿" }],
    });
  });

  it("extracts output text from current and nested response shapes", () => {
    expect(extractOpenAIOutputText({ output_text: "直接文本" })).toBe("直接文本");
    expect(
      extractOpenAIOutputText({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: "第一段",
              },
              {
                type: "output_text",
                text: "第二段",
              },
            ],
          },
        ],
      }),
    ).toBe("第一段\n第二段");
    expect(
      extractOpenAIOutputText({
        choices: [
          {
            message: {
              content: "Chat 文本",
            },
          },
        ],
      }),
    ).toBe("Chat 文本");
  });

  it("extracts token usage when present", () => {
    expect(
      extractOpenAIUsage({
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30,
        },
      }),
    ).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    });
    expect(
      extractOpenAIUsage({
        usage: {
          prompt_tokens: 11,
          completion_tokens: 22,
          total_tokens: 33,
        },
      }),
    ).toEqual({
      inputTokens: 11,
      outputTokens: 22,
      totalTokens: 33,
    });
  });

  it("uses chat completions for custom OpenAI-compatible base URLs", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "节拍结果",
              },
            },
          ],
          usage: {
            prompt_tokens: 1,
            completion_tokens: 2,
            total_tokens: 3,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });

    const result = await createOpenAITextResponse(
      {
        model: "deepseek-v4-pro",
        systemPrompt: "系统",
        developerPrompt: "开发者",
        input: "生成章节节拍",
      },
      {
        env: {
          OPENAI_API_KEY: "sk-test",
          OPENAI_MODEL: "deepseek-v4-pro",
          OPENAI_BASE_URL: "https://api.deepseek.com",
        },
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const requestInit = (fetchImpl.mock.calls as unknown as [string, RequestInit][])[0][1];

    expect(JSON.parse(String(requestInit.body))).toEqual({
      model: "deepseek-v4-pro",
      messages: [
        {
          role: "system",
          content: "系统\n\n开发者",
        },
        {
          role: "user",
          content: "生成章节节拍",
        },
      ],
    });
    expect(result.outputText).toBe("节拍结果");
    expect(result.usage).toEqual({
      inputTokens: 1,
      outputTokens: 2,
      totalTokens: 3,
    });
  });

  it("adds endpoint and request size details to network failures", async () => {
    const fetchError = Object.assign(new Error("fetch failed"), {
      cause: {
        code: "UND_ERR_SOCKET",
        message: "other side closed",
      },
    });
    const fetchImpl = vi.fn(async () => {
      throw fetchError;
    });
    let thrownError: unknown;

    try {
      await createOpenAITextResponse(
        {
          model: "deepseek-v4-pro",
          input: "摘要正文",
        },
        {
          env: {
            OPENAI_API_KEY: "sk-test",
            OPENAI_MODEL: "deepseek-v4-pro",
            OPENAI_BASE_URL: "https://api.deepseek.com",
          },
          fetchImpl,
        },
      );
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toContain(
      "AI 接口请求未收到响应：https://api.deepseek.com/chat/completions",
    );
    expect((thrownError as Error).message).toContain(
      "UND_ERR_SOCKET other side closed",
    );
  });

  it("uses custom request timeout details in abort errors", async () => {
    const abortError = Object.assign(new Error("aborted"), {
      name: "AbortError",
    });
    const fetchImpl = vi.fn(async () => {
      throw abortError;
    });
    let thrownError: unknown;

    try {
      await createOpenAITextResponse(
        {
          model: "kimi-k2.6",
          input: "生成章节草稿",
        },
        {
          env: {
            OPENAI_API_KEY: "sk-test",
            OPENAI_MODEL: "kimi-k2.6",
            OPENAI_BASE_URL: "https://api.moonshot.cn/v1",
          },
          fetchImpl,
          timeoutMs: defaultOpenAIRequestTimeoutMs * 5,
        },
      );
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toContain(
      "AI 接口请求超时（600 秒）：https://api.moonshot.cn/v1/chat/completions",
    );
  });

  it("uses a timeout-aware server dispatcher for model requests", async () => {
    const fetchSpy = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(
          (init as RequestInit & { dispatcher?: unknown }).dispatcher,
        ).toBeTruthy();

        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "草稿结果" } }],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    );
    vi.stubGlobal("fetch", fetchSpy);

    try {
      const result = await createOpenAITextResponse(
        {
          model: "kimi-k2.6",
          input: "生成章节草稿",
        },
        {
          env: {
            NOVELFORGE_AI_CONFIG_PATH: "/nonexistent/novelforge-test.env",
            OPENAI_API_KEY: "sk-test",
            OPENAI_MODEL: "kimi-k2.6",
            OPENAI_BASE_URL: "https://api.moonshot.cn/v1",
            NO_PROXY: "*",
          },
          timeoutMs: defaultOpenAIRequestTimeoutMs * 5,
        },
      );

      expect(result.outputText).toBe("草稿结果");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps the request timeout active while reading the response body", async () => {
    vi.useFakeTimers();
    try {
      const stalledResponse = {
        ok: true,
        status: 200,
        text: vi.fn(() => new Promise<string>(() => {})),
      } as unknown as Response;
      const fetchImpl = vi.fn(async () => stalledResponse);
      const responsePromise = createOpenAITextResponse(
        {
          model: "kimi-k2.6",
          input: "生成章节草稿",
        },
        {
          env: {
            OPENAI_API_KEY: "sk-test",
            OPENAI_MODEL: "kimi-k2.6",
            OPENAI_BASE_URL: "https://api.moonshot.cn/v1",
          },
          fetchImpl,
          timeoutMs: 1000,
        },
      );

      const rejectionExpectation = expect(responsePromise).rejects.toThrow(
        "AI 接口请求超时（1 秒）：https://api.moonshot.cn/v1/chat/completions",
      );

      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(1000);
      await rejectionExpectation;
      expect(fetchImpl).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
