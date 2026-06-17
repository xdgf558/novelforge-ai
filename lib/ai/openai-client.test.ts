import { describe, expect, it } from "vitest";
import {
  buildOpenAIInputMessages,
  buildOpenAIResponsesPayload,
  extractOpenAIOutputText,
  extractOpenAIUsage,
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
  });
});
