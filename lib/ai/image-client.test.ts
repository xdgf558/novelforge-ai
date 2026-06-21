import { describe, expect, it, vi } from "vitest";
import {
  buildImageGenerationPayload,
  createImageGeneration,
  extractGeneratedImages,
} from "./image-client";

describe("image generation client", () => {
  it("builds an OpenAI-compatible image payload with optional size and quality", () => {
    expect(
      buildImageGenerationPayload(
        {
          prompt: "1999 年县城电脑培训班封面",
          n: 3,
          size: "1024x1536",
          quality: "high",
        },
        {
          model: "qwen-image-2",
          size: "default",
          quality: "default",
        },
      ),
    ).toEqual({
      model: "qwen-image-2",
      prompt: "1999 年县城电脑培训班封面",
      n: 3,
      size: "1024x1536",
      quality: "high",
    });
  });

  it("omits default size and quality from the request payload", () => {
    expect(
      buildImageGenerationPayload(
        {
          prompt: "封面",
          n: 12,
        },
        {
          model: "qwen-image-2",
          size: "default",
          quality: "default",
        },
      ),
    ).toEqual({
      model: "qwen-image-2",
      prompt: "封面",
      n: 4,
    });
  });

  it("extracts data URLs, base64 payloads, and image URLs", () => {
    expect(
      extractGeneratedImages({
        data: [
          {
            b64_json: "base64-bytes",
            revised_prompt: "revised",
          },
          {
            data: "data:image/webp;base64,webp-bytes",
          },
          {
            url: "https://cdn.example/cover.png",
            mime_type: "image/png",
          },
        ],
      }),
    ).toEqual([
      {
        dataBase64: "base64-bytes",
        dataUrl: "data:image/png;base64,base64-bytes",
        mimeType: "image/png",
        revisedPrompt: "revised",
        url: null,
      },
      {
        dataBase64: "webp-bytes",
        dataUrl: "data:image/webp;base64,webp-bytes",
        mimeType: "image/webp",
        revisedPrompt: null,
        url: null,
      },
      {
        dataBase64: null,
        dataUrl: null,
        mimeType: "image/png",
        revisedPrompt: null,
        url: "https://cdn.example/cover.png",
      },
    ]);
  });

  it("calls the configured image endpoint and returns normalized images", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              b64_json: "image-bytes",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    ) as unknown as typeof fetch;

    const result = await createImageGeneration(
      {
        prompt: "封面",
      },
      {
        env: {
          IMAGE_API_KEY: "ppq-key",
          IMAGE_API_BASE_URL: "https://api.ppq.ai/v1",
          IMAGE_MODEL: "qwen-image-2",
          IMAGE_SIZE: "default",
          IMAGE_QUALITY: "default",
          NOVELFORGE_AI_CONFIG_PATH: "/tmp/non-existent-novelforge-image-env",
        },
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.ppq.ai/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer ppq-key",
        }),
      }),
    );
    expect(result.images[0]).toMatchObject({
      dataBase64: "image-bytes",
      mimeType: "image/png",
    });
  });

  it("throws a clear error when the image API key is missing", async () => {
    await expect(
      createImageGeneration(
        {
          prompt: "封面",
        },
        {
          env: {
            NOVELFORGE_AI_CONFIG_PATH: "/tmp/non-existent-novelforge-image-env",
          },
          fetchImpl: vi.fn() as unknown as typeof fetch,
        },
      ),
    ).rejects.toThrow("IMAGE_API_KEY is not configured");
  });

  it("surfaces provider error messages", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            message: "quota exceeded",
          },
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    ) as unknown as typeof fetch;

    await expect(
      createImageGeneration(
        {
          prompt: "封面",
        },
        {
          env: {
            IMAGE_API_KEY: "ppq-key",
            IMAGE_API_BASE_URL: "https://api.ppq.ai/v1",
            IMAGE_MODEL: "qwen-image-2",
            NOVELFORGE_AI_CONFIG_PATH: "/tmp/non-existent-novelforge-image-env",
          },
          fetchImpl,
        },
      ),
    ).rejects.toThrow("quota exceeded");
  });
});
