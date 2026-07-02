import { beforeEach, describe, expect, it, vi } from "vitest";

import { persistGeneratedCoverCandidates } from "./cover-candidates";

const mocks = vi.hoisted(() => ({
  deleteProjectCoverAsset: vi.fn(),
  saveProjectCoverCandidateAssetFromBuffer: vi.fn(),
}));

vi.mock("@/lib/project-cover-assets", () => ({
  deleteProjectCoverAsset: mocks.deleteProjectCoverAsset,
  saveProjectCoverCandidateAssetFromBuffer:
    mocks.saveProjectCoverCandidateAssetFromBuffer,
}));

describe("publish cover candidate services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteProjectCoverAsset.mockResolvedValue(undefined);
    mocks.saveProjectCoverCandidateAssetFromBuffer.mockResolvedValue({
      fileName: "generated-cover-1.png",
      mimeType: "image/png",
      relativePath: "cover-candidates/project_1/task_1/generated-cover-1.png",
      sizeBytes: 3,
    });
  });

  it("persists base64 image candidates as local assets", async () => {
    const result = await persistGeneratedCoverCandidates({
      images: [
        {
          dataBase64: Buffer.from("png").toString("base64"),
          dataUrl: null,
          mimeType: "image/png",
          revisedPrompt: "雨夜旧牢封面",
          url: null,
        },
      ],
      projectId: "project_1",
      taskId: "task_1",
    });

    expect(mocks.saveProjectCoverCandidateAssetFromBuffer).toHaveBeenCalledWith({
      buffer: Buffer.from("png"),
      fileName: "generated-cover-1",
      mimeType: "image/png",
      projectId: "project_1",
      taskId: "task_1",
    });
    expect(result).toEqual({
      images: [
        {
          assetPath: "cover-candidates/project_1/task_1/generated-cover-1.png",
          fileName: "generated-cover-1.png",
          mimeType: "image/png",
          revisedPrompt: "雨夜旧牢封面",
          sizeBytes: 3,
        },
      ],
      skippedUrlCount: 0,
    });
  });

  it("defaults base64 candidates without a declared MIME type to png", async () => {
    await persistGeneratedCoverCandidates({
      images: [
        {
          dataBase64: Buffer.from("png").toString("base64"),
          dataUrl: null,
          mimeType: null,
          revisedPrompt: null,
          url: null,
        },
      ],
      projectId: "project_1",
      taskId: "task_1",
    });

    expect(mocks.saveProjectCoverCandidateAssetFromBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "image/png",
      }),
    );
  });

  it("rejects URL-only candidates without downloading remote images", async () => {
    await expect(
      persistGeneratedCoverCandidates({
        images: [
          {
            dataBase64: null,
            dataUrl: null,
            mimeType: "image/png",
            revisedPrompt: null,
            url: "http://127.0.0.1/private.png",
          },
        ],
        projectId: "project_1",
        taskId: "task_1",
      }),
    ).rejects.toThrow("只返回了 URL 型候选图");

    expect(mocks.saveProjectCoverCandidateAssetFromBuffer).not.toHaveBeenCalled();
    expect(mocks.deleteProjectCoverAsset).not.toHaveBeenCalled();
  });
});
