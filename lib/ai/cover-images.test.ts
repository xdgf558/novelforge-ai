import { describe, expect, it } from "vitest";
import {
  buildCoverImagePromptContext,
  coverImageGenerationTaskType,
  normalizeCoverImageTarget,
  parseCoverImageTaskOutput,
  parseCoverImageRequestPrompt,
} from "./cover-images";

describe("cover image generation helpers", () => {
  it("builds a prompt from the latest publish package cover prompt", () => {
    const context = buildCoverImagePromptContext({
      imageCount: 2,
      latestCoverPrompt: "1999 年县城夏天，少年与老式电脑。",
      project: {
        title: "离线未来",
        genre: "穿越",
        targetAudience: "20-40 岁年轻人",
        description: "程序员带着断网 AI 回到 1999 年。",
      },
      setting: {
        sellingPoint: "失业程序员 + 断网 AI + 穿越 1999 年",
        forbiddenItems: "避免真实企业负面影射。",
      },
      target: "book_cover",
    });

    expect(coverImageGenerationTaskType).toBe("cover_image_generation");
    expect(context.imageCount).toBe(2);
    expect(context.target).toMatchObject({
      key: "book_cover",
      suggestedSize: "1024x1536",
    });
    expect(context.inputContextSummary).toContain("已有封面提示词");
    expect(context.prompt).toContain("1999 年县城夏天");
    expect(context.prompt).toContain("不要生成可读文字");
  });

  it("lets a manual prompt override the publish package prompt", () => {
    const context = buildCoverImagePromptContext({
      latestCoverPrompt: "旧提示词",
      project: {
        title: "离线未来",
      },
      requestPrompt: "手动封面提示词",
      target: "wide_banner",
    });

    expect(context.inputJson.source).toBe("manual_prompt");
    expect(context.inputJson.cover.prompt).toBe("手动封面提示词");
    expect(context.target).toMatchObject({
      key: "wide_banner",
      aspectRatio: "16:9",
    });
  });

  it("falls back to project basics when no cover prompt exists", () => {
    const context = buildCoverImagePromptContext({
      imageCount: 9,
      project: {
        title: "离线未来",
        description: "断网 AI 穿越故事",
      },
    });

    expect(context.imageCount).toBe(4);
    expect(context.inputJson.source).toBe("project_fallback");
    expect(context.inputJson.cover.prompt).toContain("离线未来");
  });

  it("parses stored cover image task outputs", () => {
    expect(
      parseCoverImageTaskOutput(
        JSON.stringify({
          endpoint: "https://api.ppq.ai/v1/images/generations",
          images: [
            {
              assetPath: "cover-candidates/project/task/cover-1.png",
              fileName: "cover-1.png",
              mimeType: "image/png",
              sizeBytes: 1024,
            },
            {
              url: "https://cdn.example/cover.webp",
            },
            {
              ignored: true,
            },
          ],
        }),
      ),
    ).toMatchObject({
      endpoint: "https://api.ppq.ai/v1/images/generations",
      images: [
        {
          assetPath: "cover-candidates/project/task/cover-1.png",
          fileName: "cover-1.png",
          mimeType: "image/png",
          sizeBytes: 1024,
        },
      ],
    });
  });

  it("normalizes invalid targets to the book cover target", () => {
    expect(normalizeCoverImageTarget("unknown")).toMatchObject({
      key: "book_cover",
    });
  });

  it("rejects forged overlong cover prompts on the server side", () => {
    expect(parseCoverImageRequestPrompt("x".repeat(3001))).toEqual({
      ok: false,
      prompt: "",
    });
    expect(parseCoverImageRequestPrompt("  short prompt  ")).toEqual({
      ok: true,
      prompt: "short prompt",
    });
  });
});
