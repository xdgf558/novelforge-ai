import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOutlineRecord,
  deleteOutlineRecord,
  findOutlineForProject,
  updateOutlineRecord,
} from "./records";

const mocks = vi.hoisted(() => ({
  prisma: {
    outline: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

const chapterOutlineValues = {
  level: "chapter",
  title: "第 3 章《墙痕对质》",
  status: "planned",
  sortOrder: 3,
  content: "",
  volumeNumber: null,
  unitNumber: null,
  chapterNumber: 3,
  startChapter: null,
  endChapter: null,
  expectedChapters: null,
  expectedWords: 5000,
  goal: "让沈裴完成第一次现场合作。",
  mainlineProgression: "",
  mainConflict: "",
  mainAntagonist: "",
  keyTurns: "",
  climax: "",
  coreEvents: "",
  characterChanges: "",
  pleasureDesign: "",
  suspenseDesign: "",
  chapterConflict: "",
  chapterPleasurePoint: "",
  foreshadow: "",
  resolvedForeshadow: "",
  characters: "",
  location: "大理寺旧牢",
  endingHook: "",
} as const;

describe("outline record services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.outline.create.mockResolvedValue({
      id: "outline_3",
    });
    mocks.prisma.outline.findFirst.mockResolvedValue({
      id: "outline_3",
    });
    mocks.prisma.outline.update.mockResolvedValue({
      id: "outline_3",
    });
    mocks.prisma.outline.delete.mockResolvedValue({
      id: "outline_3",
    });
  });

  it("finds outlines only inside the requested project", async () => {
    await findOutlineForProject({
      outlineId: "outline_3",
      projectId: "project_1",
    });

    expect(mocks.prisma.outline.findFirst).toHaveBeenCalledWith({
      where: {
        id: "outline_3",
        projectId: "project_1",
      },
      select: {
        id: true,
      },
    });
  });

  it("creates outline snapshots with project ownership", async () => {
    await createOutlineRecord({
      projectId: "project_1",
      values: chapterOutlineValues,
    });

    expect(mocks.prisma.outline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        level: "chapter",
        title: "第 3 章《墙痕对质》",
        chapterNumber: 3,
        goal: "让沈裴完成第一次现场合作。",
      }),
    });
  });

  it("updates outline snapshots without touching route concerns", async () => {
    await updateOutlineRecord({
      outlineId: "outline_3",
      values: chapterOutlineValues,
    });

    expect(mocks.prisma.outline.update).toHaveBeenCalledWith({
      where: {
        id: "outline_3",
      },
      data: expect.objectContaining({
        title: "第 3 章《墙痕对质》",
        expectedWords: 5000,
      }),
    });
  });

  it("deletes the scoped outline record after the action has checked ownership", async () => {
    await deleteOutlineRecord("outline_3");

    expect(mocks.prisma.outline.delete).toHaveBeenCalledWith({
      where: {
        id: "outline_3",
      },
    });
  });
});
