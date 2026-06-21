import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveCharacterRelationship,
  createCharacterRelationship,
  updateCharacterRelationship,
} from "./actions";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    character: {
      count: vi.fn(),
    },
    chapter: {
      count: vi.fn(),
    },
    characterRelationship: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
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

function buildRelationshipFormData(
  overrides: Partial<Record<string, string>> = {},
) {
  const values = {
    sourceCharacterId: "character_a",
    targetCharacterId: "character_b",
    relationshipType: "ally",
    direction: "two_way",
    status: "active",
    summary: "两人是早期创业搭档。",
    dynamics: "后续会因为利益分配产生裂缝。",
    evidence: "第 2 章确认合伙。",
    sourceChapterId: "chapter_2",
    ...overrides,
  };
  const formData = new FormData();

  Object.entries(values).forEach(([name, value]) => {
    formData.set(name, value);
  });

  return formData;
}

describe("character relationship actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.redirect.mockImplementation((url: string) => {
      const error = new Error("NEXT_REDIRECT");
      Object.assign(error, { url });
      throw error;
    });
    mocks.prisma.project.findUnique.mockResolvedValue({
      id: "project_1",
    });
    mocks.prisma.character.count.mockResolvedValue(2);
    mocks.prisma.chapter.count.mockResolvedValue(1);
    mocks.prisma.characterRelationship.create.mockResolvedValue({
      id: "relationship_1",
    });
    mocks.prisma.characterRelationship.count.mockResolvedValue(0);
    mocks.prisma.characterRelationship.findFirst.mockResolvedValue({
      id: "relationship_1",
    });
    mocks.prisma.characterRelationship.update.mockResolvedValue({
      id: "relationship_1",
    });
  });

  it("creates a relationship when both characters and chapter belong to the project", async () => {
    await expect(
      createCharacterRelationship("project_1", buildRelationshipFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.characterRelationship.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        sourceCharacterId: "character_a",
        targetCharacterId: "character_b",
        relationshipType: "ally",
        summary: "两人是早期创业搭档。",
      }),
    });
  });

  it("rejects relationships where both ends are the same character", async () => {
    await expect(
      createCharacterRelationship(
        "project_1",
        buildRelationshipFormData({
          targetCharacterId: "character_a",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=sameCharacter",
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("rejects cross-project character references", async () => {
    mocks.prisma.character.count.mockResolvedValue(1);

    await expect(
      createCharacterRelationship("project_1", buildRelationshipFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=invalidCharacterReference",
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("rejects cross-project source chapter references", async () => {
    mocks.prisma.chapter.count.mockResolvedValue(0);

    await expect(
      createCharacterRelationship("project_1", buildRelationshipFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=invalidChapterReference",
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate active relationships for the same pair, type, and direction", async () => {
    mocks.prisma.characterRelationship.count.mockResolvedValue(1);

    await expect(
      createCharacterRelationship("project_1", buildRelationshipFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/projects/project_1/characters/network?relationshipError=duplicateRelationship",
    );
    expect(mocks.prisma.characterRelationship.create).not.toHaveBeenCalled();
  });

  it("updates only relationships owned by the current project", async () => {
    await expect(
      updateCharacterRelationship(
        "project_1",
        "relationship_1",
        buildRelationshipFormData({
          status: "tension",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.characterRelationship.findFirst).toHaveBeenCalledWith({
      where: {
        id: "relationship_1",
        projectId: "project_1",
      },
      select: {
        id: true,
      },
    });
    expect(mocks.prisma.characterRelationship.update).toHaveBeenCalledWith({
      where: {
        id: "relationship_1",
      },
      data: expect.objectContaining({
        status: "tension",
      }),
    });
  });

  it("archives relationships instead of hard deleting them", async () => {
    await expect(
      archiveCharacterRelationship("project_1", "relationship_1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.prisma.characterRelationship.update).toHaveBeenCalledWith({
      where: {
        id: "relationship_1",
      },
      data: {
        status: "archived",
      },
    });
  });
});
