import { beforeEach, describe, expect, it, vi } from "vitest";

import { findEndingPlanningForeshadows } from "./ending-planning";

const mocks = vi.hoisted(() => ({
  prisma: {
    foreshadow: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("ending-planning foreshadow selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prioritizes high unresolved foreshadows, sorted other unresolved items, and recent resolved items", async () => {
    mocks.prisma.foreshadow.findMany
      .mockResolvedValueOnce([
        {
          id: "high_1",
          content: "沈氏旧印缺角。",
          status: "planted",
          importance: "high",
          updatedAt: new Date("2026-07-01T10:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "low_1",
          content: "低优先伏笔。",
          status: "planted",
          importance: "low",
          updatedAt: new Date("2026-07-01T12:00:00.000Z"),
        },
        {
          id: "medium_1",
          content: "中优先伏笔。",
          status: "advancing",
          importance: "medium",
          updatedAt: new Date("2026-07-01T09:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "resolved_1",
          content: "已经回收的近期伏笔。",
          status: "resolved",
          importance: "medium",
          updatedAt: new Date("2026-07-01T08:00:00.000Z"),
        },
      ]);

    await expect(findEndingPlanningForeshadows("project_1")).resolves.toEqual([
      expect.objectContaining({
        id: "high_1",
      }),
      expect.objectContaining({
        id: "medium_1",
      }),
      expect.objectContaining({
        id: "low_1",
      }),
      expect.objectContaining({
        id: "resolved_1",
      }),
    ]);

    expect(mocks.prisma.foreshadow.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          importance: "high",
        }),
        take: 30,
      }),
    );
  });
});
