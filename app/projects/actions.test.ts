import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProject, deleteProject, updateProject } from "./actions";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  deleteProjectAudioAssets: vi.fn(),
  deleteProjectCoverAssets: vi.fn(),
  prisma: {
    project: {
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
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
});
