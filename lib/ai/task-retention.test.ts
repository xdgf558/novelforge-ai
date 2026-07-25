import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  aiTaskIdsToPrune,
  pruneProjectAiTasks,
  projectAiTaskRetentionLimit,
} from "./task-retention";

const mocks = vi.hoisted(() => ({
  deleteProjectCoverCandidateAssetsForTask: vi.fn(),
  prisma: {
    aiTask: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("../project-cover-assets", () => ({
  deleteProjectCoverCandidateAssetsForTask:
    mocks.deleteProjectCoverCandidateAssetsForTask,
}));

function task(id: string, offset: number, status = "completed") {
  return {
    id,
    status,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, offset)),
  };
}

describe("AI task retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.aiTask.deleteMany.mockResolvedValue({
      count: 1,
    });
  });

  it("keeps the newest project task records within the retention limit", () => {
    const tasks = Array.from({ length: 12 }, (_, index) =>
      task(`task_${index}`, index),
    );

    expect(aiTaskIdsToPrune(tasks)).toEqual(["task_1", "task_0"]);
  });

  it("keeps pending and running tasks even when they are older than the limit", () => {
    const tasks = Array.from(
      { length: projectAiTaskRetentionLimit + 2 },
      (_, index) => task(`task_${index}`, index),
    );

    tasks[0].status = "pending";
    tasks[1].status = "running";

    expect(aiTaskIdsToPrune(tasks)).toEqual([]);
  });

  it("never prunes durable summaries or tasks referenced by formal records", () => {
    const tasks = Array.from({ length: 15 }, (_, index) =>
      task(`task_${index}`, index),
    ).map((item, index) => ({
      ...item,
      taskType:
        index === 0
          ? "chapter_summary_extraction"
          : index === 3
            ? "short_story_whole_review"
            : "chapter_beat_generation",
      ...(index === 1
        ? {
            _count: {
              pendingUpdates: 1,
            },
          }
        : index === 2
          ? {
              _count: {
                shortStoryBlueprintVersions: 1,
              },
            }
          : index === 3
            ? {
                _count: {
                  continuityReports: 1,
                },
              }
            : {}),
    }));

    expect(aiTaskIdsToPrune(tasks)).toEqual(["task_4"]);
  });

  it("protects only the latest completed ending plan while it remains usable", () => {
    const tasks = Array.from({ length: 13 }, (_, index) => ({
      ...task(`task_${index}`, index),
      taskType:
        index === 0 ? "ending_planning_generation" : "outline_generation",
      adoptionState: "not_reviewed",
      outputText: index === 0 ? "终局规划正文" : null,
    }));

    expect(aiTaskIdsToPrune(tasks)).toEqual(["task_2", "task_1"]);

    tasks[0].adoptionState = "rejected";

    expect(aiTaskIdsToPrune(tasks)).toEqual([
      "task_2",
      "task_1",
      "task_0",
    ]);
  });

  it("uses the shared tiebreak and whitelist for the latest ending plan", () => {
    const createdAt = new Date("2026-07-25T06:41:00.000Z");
    const tasks = [
      {
        id: "ending_a",
        createdAt,
        status: "completed",
        taskType: "ending_planning_generation",
        adoptionState: "adopted",
        outputText: "较早的可用规划",
      },
      {
        id: "ending_z",
        createdAt,
        status: "completed",
        taskType: "ending_planning_generation",
        adoptionState: "superseded",
        outputText: "同一时间但 id 更新的失效规划",
      },
    ];

    expect(aiTaskIdsToPrune(tasks, 0)).toEqual([
      "ending_z",
      "ending_a",
    ]);
  });

  it("cleans cover candidate assets before pruning old cover image tasks", async () => {
    mocks.prisma.aiTask.findMany.mockResolvedValue([
      {
        id: "task_new",
        createdAt: new Date("2026-01-01T00:00:02.000Z"),
        status: "completed",
        taskType: "chapter_beat_generation",
        adoptionState: "not_reviewed",
        outputText: null,
      },
      {
        id: "task_old_cover",
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
        status: "completed",
        taskType: "cover_image_generation",
        adoptionState: "not_reviewed",
        outputText: null,
      },
    ]);

    await expect(pruneProjectAiTasks("project_1", 1)).resolves.toBe(1);

    expect(mocks.deleteProjectCoverCandidateAssetsForTask).toHaveBeenCalledWith({
      projectId: "project_1",
      taskId: "task_old_cover",
    });
    expect(mocks.prisma.aiTask.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["task_old_cover"],
        },
        projectId: "project_1",
      },
    });
  });

  it("loads adoption state so retention can preserve the active ending reference", async () => {
    mocks.prisma.aiTask.findMany.mockResolvedValue([]);

    await expect(pruneProjectAiTasks("project_1")).resolves.toBe(0);

    expect(mocks.prisma.aiTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          adoptionState: true,
          outputText: true,
        }),
      }),
    );
  });
});
