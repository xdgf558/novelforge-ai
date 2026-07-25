import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureDefaultPromptTemplate } from "./prompt-template-store";

const mocks = vi.hoisted(() => ({
  prisma: {
    aiPromptTemplate: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("prompt template store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the active project template when it is at least the default version", async () => {
    const activeTemplate = {
      id: "template_active",
      key: "chapter_draft_generation",
      version: 4,
      status: "active",
    };
    mocks.prisma.aiPromptTemplate.findFirst.mockResolvedValue(activeTemplate);

    await expect(
      ensureDefaultPromptTemplate("project_1", "chapter_draft_generation"),
    ).resolves.toBe(activeTemplate);

    expect(mocks.prisma.aiPromptTemplate.upsert).not.toHaveBeenCalled();
    expect(mocks.prisma.aiPromptTemplate.updateMany).not.toHaveBeenCalled();
  });

  it("upserts the newer default template and disables older active versions when the active project template is stale", async () => {
    const defaultTemplate = {
      id: "template_default_v4",
      key: "chapter_draft_generation",
      version: 4,
      status: "active",
      systemPrompt: "new default",
    };
    mocks.prisma.aiPromptTemplate.findFirst.mockResolvedValue({
      id: "template_stale_v1",
      key: "chapter_draft_generation",
      version: 1,
      status: "active",
    });
    mocks.prisma.aiPromptTemplate.upsert.mockResolvedValue(defaultTemplate);

    await expect(
      ensureDefaultPromptTemplate("project_1", "chapter_draft_generation"),
    ).resolves.toBe(defaultTemplate);

    expect(mocks.prisma.aiPromptTemplate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_key_version: {
            projectId: "project_1",
            key: "chapter_draft_generation",
            version: 4,
          },
        },
        create: expect.objectContaining({
          projectId: "project_1",
          key: "chapter_draft_generation",
          version: 4,
          status: "active",
        }),
      }),
    );
    expect(mocks.prisma.aiPromptTemplate.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        key: "chapter_draft_generation",
        version: {
          lt: 4,
        },
        status: "active",
      },
      data: {
        status: "inactive",
      },
    });
  });

  it("upgrades existing outline projects from prompt v1 to v2 on demand", async () => {
    mocks.prisma.aiPromptTemplate.findFirst.mockResolvedValue({
      id: "outline_template_v1",
      key: "outline_generation",
      version: 1,
      status: "active",
    });
    mocks.prisma.aiPromptTemplate.upsert.mockResolvedValue({
      id: "outline_template_v2",
      key: "outline_generation",
      version: 2,
      status: "active",
    });

    await expect(
      ensureDefaultPromptTemplate("project_1", "outline_generation"),
    ).resolves.toMatchObject({
      id: "outline_template_v2",
      version: 2,
    });

    expect(mocks.prisma.aiPromptTemplate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_key_version: {
            projectId: "project_1",
            key: "outline_generation",
            version: 2,
          },
        },
      }),
    );
    expect(mocks.prisma.aiPromptTemplate.updateMany).toHaveBeenCalledWith({
      where: {
        projectId: "project_1",
        key: "outline_generation",
        version: {
          lt: 2,
        },
        status: "active",
      },
      data: {
        status: "inactive",
      },
    });
  });
});
