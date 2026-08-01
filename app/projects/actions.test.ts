import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeAndArchiveProject,
  createProject,
  deleteProject,
  updateProject,
} from "./actions";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  deleteProjectAudioAssets: vi.fn(),
  deleteProjectCoverAssets: vi.fn(),
  prisma: {
    project: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/audio/audio-assets", () => ({
  deleteProjectAudioAssets: mocks.deleteProjectAudioAssets,
}));

vi.mock("@/lib/project-cover-assets", () => ({
  deleteProjectCoverAssets: mocks.deleteProjectCoverAssets,
}));

function buildProjectFormData(
  overrides: Partial<Record<string, string | number>> = {},
) {
  const values = {
    title: "离线未来",
    workType: "serial_novel",
    genre: "",
    targetAudience: "",
    platform: "",
    totalWordTarget: "",
    chapterWordMin: "",
    chapterWordMax: "",
    aiDailyTokenBudget: "",
    updateFrequency: "",
    description: "",
    wechatPositioning: "",
    ...overrides,
  };
  const formData = new FormData();

  Object.entries(values).forEach(([name, value]) => {
    formData.set(name, String(value));
  });

  return formData;
}

describe("project actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((url: string) => {
      const error = new Error("NEXT_REDIRECT");
      Object.assign(error, { url });
      throw error;
    });
    mocks.prisma.project.update.mockResolvedValue({});
    mocks.prisma.project.create.mockResolvedValue({ id: "project_1" });
    mocks.prisma.project.delete.mockResolvedValue({});
    mocks.prisma.project.findUnique.mockResolvedValue({
      status: "active",
      totalWordTarget: 10_000,
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      workType: "serial_novel",
      chapters: [
        {
          finalText: "甲".repeat(5_000),
          status: "final",
          wordCount: 5_000,
        },
        {
          finalText: "乙".repeat(5_000),
          status: "published",
          wordCount: 5_000,
        },
      ],
    });
    mocks.prisma.project.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.prisma),
    );
    mocks.deleteProjectAudioAssets.mockResolvedValue(undefined);
    mocks.deleteProjectCoverAssets.mockResolvedValue(undefined);
  });

  it("clears the AI daily token budget when the field is submitted empty", async () => {
    await expect(
      updateProject("project_1", buildProjectFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "project_1",
        },
        data: expect.objectContaining({
          aiDailyTokenBudget: null,
        }),
      }),
    );
  });

  it("creates a title-only short story when its hidden update frequency is absent", async () => {
    const formData = buildProjectFormData({
      title: "《永生者档案：坠星瓶》",
      workType: "short_story",
    });
    formData.delete("updateFrequency");

    await expect(
      createProject(formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "《永生者档案：坠星瓶》",
        workType: "short_story",
      }),
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/projects/project_1");
  });

  it("defaults legacy create submissions to serial novels", async () => {
    const formData = buildProjectFormData();
    formData.delete("workType");

    await expect(createProject(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workType: "serial_novel",
      }),
    });
  });

  it("does not convert the project work type from the general edit form", async () => {
    await expect(
      updateProject(
        "project_1",
        buildProjectFormData({
          workType: "tampered_mode",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          workType: expect.anything(),
        }),
      }),
    );
  });

  it("saves a positive AI daily token budget", async () => {
    await expect(
      updateProject(
        "project_1",
        buildProjectFormData({
          aiDailyTokenBudget: 200000,
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiDailyTokenBudget: 200000,
        }),
      }),
    );
  });

  it("requires restoring a completed project before changing its word target", async () => {
    mocks.prisma.project.findUnique.mockResolvedValue({
      id: "project_1",
      status: "completed",
      totalWordTarget: 10_000,
    });
    mocks.prisma.project.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateProject(
        "project_1",
        buildProjectFormData({
          totalWordTarget: 12_000,
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.project.updateMany).toHaveBeenCalledWith({
      where: {
        id: "project_1",
        status: "active",
      },
      data: expect.objectContaining({
        totalWordTarget: 12_000,
      }),
    });
    expect(mocks.prisma.project.update).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/edit?projectError=restore-required",
    );
  });

  it("removes project-scoped cover and audio assets after hard deletion", async () => {
    const formData = new FormData();
    formData.set("deleteConfirmation", "DELETE");
    formData.set("backupAcknowledged", "on");

    await expect(deleteProject("project_1", formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.project.delete).toHaveBeenCalledWith({
      where: {
        id: "project_1",
      },
    });
    expect(mocks.deleteProjectCoverAssets).toHaveBeenCalledWith("project_1");
    expect(mocks.deleteProjectAudioAssets).toHaveBeenCalledWith("project_1");
  });

  it("completes and archives an eligible serial project after verifying it on the server", async () => {
    await expect(completeAndArchiveProject("project_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.project.findUnique).toHaveBeenCalledWith({
      where: {
        id: "project_1",
      },
      select: expect.objectContaining({
        chapters: {
          select: {
            finalText: true,
            status: true,
            wordCount: true,
          },
        },
      }),
    });
    expect(mocks.prisma.project.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "project_1",
        status: "active",
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      data: {
        updatedAt: expect.any(Date),
      },
    });
    expect(mocks.prisma.project.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: "project_1",
        status: "active",
        updatedAt: expect.any(Date),
        workType: "serial_novel",
      },
      data: {
        status: "completed",
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/?projectStatus=archived&projectCompleted=1",
    );
  });

  it("does not archive a project when a chapter still needs author confirmation", async () => {
    mocks.prisma.project.findUnique.mockResolvedValue({
      status: "active",
      totalWordTarget: 10_000,
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      workType: "serial_novel",
      chapters: [
        {
          finalText: "甲".repeat(5_000),
          status: "final",
          wordCount: 5_000,
        },
        {
          finalText: "乙".repeat(5_000),
          status: "draft",
          wordCount: 5_000,
        },
      ],
    });

    await expect(completeAndArchiveProject("project_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.project.updateMany).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1?completion=not-ready",
    );
  });

  it("does not complete a project when a concurrent content write claims the project lease", async () => {
    mocks.prisma.project.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(completeAndArchiveProject("project_1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.project.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.project.updateMany).toHaveBeenCalledWith({
      where: {
        id: "project_1",
        status: "active",
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      data: {
        updatedAt: expect.any(Date),
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1?completion=not-ready",
    );
  });
});
