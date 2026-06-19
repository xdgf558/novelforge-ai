import { describe, expect, it, vi } from "vitest";
import {
  buildOpenAIChatCompletionsPayload,
  buildOpenAIInputMessages,
  buildOpenAIResponsesPayload,
  createOpenAITextResponse,
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
});
