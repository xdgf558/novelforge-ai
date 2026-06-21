import { beforeEach, describe, expect, it, vi } from "vitest";
import { adoptGeneratedProjectCover, rejectGeneratedProjectCover } from "./actions";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  readProjectCoverAssetBuffer: vi.fn(),
  saveProjectCoverAssetFromBuffer: vi.fn(),
  deleteProjectCoverAsset: vi.fn(),
  deleteProjectCoverCandidateAssetsForTask: vi.fn(),
  tx: {
    aiTask: {
      updateMany: vi.fn(),
    },
    project: {
      update: vi.fn(),
    },
  },
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    aiTask: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: mocks.redirect,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/project-cover-assets", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/project-cover-assets")>();

  return {
    ...actual,
    deleteProjectCoverAsset: mocks.deleteProjectCoverAsset,
    deleteProjectCoverCandidateAssetsForTask:
      mocks.deleteProjectCoverCandidateAssetsForTask,
    readProjectCoverAssetBuffer: mocks.readProjectCoverAssetBuffer,
    saveProjectCoverAssetFromBuffer: mocks.saveProjectCoverAssetFromBuffer,
  };
});

describe("publish cover image actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((url: string) => {
      const error = new Error("NEXT_REDIRECT");
      Object.assign(error, { url });
      throw error;
    });
    mocks.prisma.project.findUnique.mockResolvedValue({
      coverImagePath: null,
      id: "project_1",
      title: "离线未来",
    });
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.tx.aiTask.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.tx.project.update.mockResolvedValue({});
  });

  it("does not adopt URL-only generated image candidates", async () => {
    const formData = new FormData();
    formData.set("imageIndex", "0");
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputJson: JSON.stringify({
        images: [
          {
            mimeType: "image/png",
            url: "http://127.0.0.1/private.png",
          },
        ],
      }),
    });

    await expect(
      adoptGeneratedProjectCover("project_1", "task_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/publish?coverImageError=missingGeneratedImage",
    );
    expect(mocks.readProjectCoverAssetBuffer).not.toHaveBeenCalled();
    expect(mocks.saveProjectCoverAssetFromBuffer).not.toHaveBeenCalled();
  });

  it("only rejects completed generated cover tasks", async () => {
    mocks.prisma.aiTask.updateMany.mockResolvedValue({
      count: 1,
    });

    await expect(
      rejectGeneratedProjectCover("project_1", "task_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        adoptionState: "not_reviewed",
        id: "task_1",
        projectId: "project_1",
        status: "completed",
        taskType: "cover_image_generation",
      },
      data: {
        adoptionState: "rejected",
      },
    });
    expect(mocks.deleteProjectCoverCandidateAssetsForTask).toHaveBeenCalledWith({
      projectId: "project_1",
      taskId: "task_1",
    });
  });

  it("adopts a local candidate asset and removes the candidate directory", async () => {
    const formData = new FormData();
    formData.set("coverAltText", "AI 封面");
    formData.set("imageIndex", "0");
    mocks.prisma.aiTask.findFirst.mockResolvedValue({
      id: "task_1",
      outputJson: JSON.stringify({
        images: [
          {
            assetPath: "cover-candidates/project_1/task_1/candidate.png",
            fileName: "candidate.png",
            mimeType: "image/png",
            sizeBytes: 16,
          },
        ],
      }),
    });
    mocks.readProjectCoverAssetBuffer.mockResolvedValue(Buffer.from("png"));
    mocks.saveProjectCoverAssetFromBuffer.mockResolvedValue({
      fileName: "candidate.png",
      mimeType: "image/png",
      relativePath: "covers/project_1/final.png",
      sizeBytes: 16,
      updatedAt: new Date("2026-06-21T00:00:00.000Z"),
    });

    await expect(
      adoptGeneratedProjectCover("project_1", "task_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.readProjectCoverAssetBuffer).toHaveBeenCalledWith(
      "cover-candidates/project_1/task_1/candidate.png",
    );
    expect(mocks.saveProjectCoverAssetFromBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "candidate.png",
        mimeType: "image/png",
        projectId: "project_1",
      }),
    );
    expect(mocks.tx.aiTask.updateMany).toHaveBeenCalledWith({
      where: {
        adoptionState: "not_reviewed",
        id: "task_1",
        status: "completed",
      },
      data: {
        adoptionState: "adopted",
      },
    });
    expect(mocks.deleteProjectCoverCandidateAssetsForTask).toHaveBeenCalledWith({
      projectId: "project_1",
      taskId: "task_1",
    });
  });
});
