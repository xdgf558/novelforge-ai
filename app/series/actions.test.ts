import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addProjectToShortStorySeries,
  createShortStorySeriesCharacter,
  createShortStorySeries,
  deleteShortStorySeries,
  updateShortStorySeriesCharacter,
} from "./actions";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    shortStorySeries: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    shortStorySeriesEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    shortStorySeriesCharacter: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
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

function seriesFormData() {
  const formData = new FormData();
  formData.set("title", "雾城异闻录");
  formData.set("status", "active");
  formData.set("premise", "每篇调查一宗独立异常案件。");
  formData.set("sharedWorldview", "异常会留下灰痕。");
  formData.set("continuityRules", "人物认知必须跨篇累积。");
  formData.set("recurringElements", "雾城调查所");
  formData.set("longTermMysteries", "主角失忆的真相");
  formData.set("futureDirection", "下一篇推进搭档信任。");
  return formData;
}

describe("short story series actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((url: string) => {
      const error = new Error("NEXT_REDIRECT");
      Object.assign(error, { url });
      throw error;
    });
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.prisma.shortStorySeries.findUnique.mockResolvedValue({ id: "series_1" });
    mocks.prisma.shortStorySeries.create.mockResolvedValue({ id: "series_1" });
    mocks.prisma.shortStorySeries.update.mockResolvedValue({ id: "series_1" });
    mocks.prisma.shortStorySeries.delete.mockResolvedValue({ id: "series_1" });
    mocks.prisma.shortStorySeriesEntry.findMany.mockResolvedValue([
      { sortOrder: 20 },
    ]);
    mocks.prisma.shortStorySeriesEntry.create.mockResolvedValue({ id: "entry_1" });
    mocks.prisma.shortStorySeriesCharacter.findFirst.mockResolvedValue(null);
    mocks.prisma.shortStorySeriesCharacter.findMany.mockResolvedValue([]);
    mocks.prisma.shortStorySeriesCharacter.create.mockResolvedValue({
      id: "series_character_1",
    });
    mocks.prisma.shortStorySeriesCharacter.update.mockResolvedValue({
      id: "series_character_1",
    });
  });

  it("creates a manual series profile", async () => {
    await expect(createShortStorySeries(seriesFormData())).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.prisma.shortStorySeries.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "雾城异闻录",
        longTermMysteries: "主角失忆的真相",
        status: "active",
      }),
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/series/series_1");
  });

  it("adds only an unassigned short-story project at the next sort position", async () => {
    mocks.prisma.project.findUnique.mockResolvedValue({
      id: "project_1",
      workType: "short_story",
      shortStorySeriesEntry: null,
    });
    const formData = new FormData();
    formData.set("projectId", "project_1");

    await expect(
      addProjectToShortStorySeries("series_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.shortStorySeriesEntry.create).toHaveBeenCalledWith({
      data: {
        projectId: "project_1",
        seriesId: "series_1",
        sortOrder: 30,
      },
    });
    expect(mocks.prisma.shortStorySeries.update).toHaveBeenCalled();
  });

  it("rejects serial novels at the series boundary", async () => {
    mocks.prisma.project.findUnique.mockResolvedValue({
      id: "project_1",
      workType: "serial_novel",
      shortStorySeriesEntry: null,
    });
    const formData = new FormData();
    formData.set("projectId", "project_1");

    await expect(
      addProjectToShortStorySeries("series_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/series/series_1?seriesError=invalid-project",
    );
    expect(mocks.prisma.shortStorySeriesEntry.create).not.toHaveBeenCalled();
  });

  it("maps a concurrent project assignment conflict to the existing message", async () => {
    mocks.prisma.project.findUnique.mockResolvedValue({
      id: "project_1",
      workType: "short_story",
      shortStorySeriesEntry: null,
    });
    mocks.prisma.shortStorySeriesEntry.create.mockRejectedValue({
      code: "P2002",
    });
    const formData = new FormData();
    formData.set("projectId", "project_1");

    await expect(
      addProjectToShortStorySeries("series_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/series/series_1?seriesError=already-assigned",
    );
  });

  it("maps a concurrent character creation conflict to the duplicate message", async () => {
    mocks.prisma.shortStorySeriesCharacter.create.mockRejectedValue({
      code: "P2002",
    });
    const formData = new FormData();
    formData.set("name", "林野");
    formData.set("status", "active");

    await expect(
      createShortStorySeriesCharacter("series_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/series/series_1?seriesError=duplicate-character",
    );
  });

  it("maps a concurrent character rename conflict to the edit message", async () => {
    mocks.prisma.shortStorySeriesCharacter.findFirst
      .mockResolvedValueOnce({ id: "series_character_1" })
      .mockResolvedValueOnce(null);
    mocks.prisma.shortStorySeriesCharacter.update.mockRejectedValue({
      code: "P2002",
    });
    const formData = new FormData();
    formData.set("name", "林野");
    formData.set("status", "active");

    await expect(
      updateShortStorySeriesCharacter(
        "series_1",
        "series_character_1",
        formData,
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/series/series_1/characters/series_character_1/edit?seriesError=duplicate-character",
    );
  });

  it("deletes the parent series without issuing a project deletion", async () => {
    const formData = new FormData();
    formData.set("deleteConfirmation", "DELETE");

    await expect(
      deleteShortStorySeries("series_1", formData),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.shortStorySeries.delete).toHaveBeenCalledWith({
      where: {
        id: "series_1",
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/series");
  });
});
