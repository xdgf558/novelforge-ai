import { describe, expect, it } from "vitest";
import {
  calculateEndingPlanPlanningWindow,
  compareAiTasksNewestFirst,
  isUsableEndingPlanTask,
  readEndingPlanPlanningWindow,
} from "./ending-plan-reference";

describe("ending plan reference rules", () => {
  it.each(["not_reviewed", "adopted"])(
    "accepts completed non-empty plans in the %s state",
    (adoptionState) => {
      expect(
        isUsableEndingPlanTask({
          id: "ending_1",
          taskType: "ending_planning_generation",
          status: "completed",
          adoptionState,
          outputText: "终局规划正文",
        }),
      ).toBe(true);
    },
  );

  it.each(["rejected", "superseded", "expired", null])(
    "rejects the %s state instead of treating unknown states as usable",
    (adoptionState) => {
      expect(
        isUsableEndingPlanTask({
          id: "ending_1",
          taskType: "ending_planning_generation",
          status: "completed",
          adoptionState,
          outputText: "终局规划正文",
        }),
      ).toBe(false);
    },
  );

  it("rejects blank output and non-completed tasks", () => {
    expect(
      isUsableEndingPlanTask({
        id: "ending_1",
        taskType: "ending_planning_generation",
        status: "completed",
        adoptionState: "adopted",
        outputText: "   ",
      }),
    ).toBe(false);
    expect(
      isUsableEndingPlanTask({
        id: "ending_1",
        taskType: "ending_planning_generation",
        status: "failed",
        adoptionState: "adopted",
        outputText: "终局规划正文",
      }),
    ).toBe(false);
  });

  it("uses id descending as the deterministic newest-task tiebreak", () => {
    const createdAt = new Date("2026-07-25T06:41:00.000Z");
    const sorted = [
      { id: "ending_a", createdAt },
      { id: "ending_z", createdAt },
    ].sort(compareAiTasksNewestFirst);

    expect(sorted.map((task) => task.id)).toEqual([
      "ending_z",
      "ending_a",
    ]);
  });

  it("estimates a bounded planning window from observed chapter pace", () => {
    expect(
      calculateEndingPlanPlanningWindow({
        latestChapterNumber: 30,
        currentWords: 126000,
        targetWords: 150000,
        chapterCount: 30,
        finalChapterCount: 30,
        chapterWordMin: 5000,
        chapterWordMax: 8000,
      }),
    ).toEqual({
      generatedAtChapterNumber: 30,
      validThroughChapterNumber: 38,
      estimatedRemainingChapterCount: 8,
    });
  });

  it("reads saved windows and derives a legacy window when needed", () => {
    expect(
      readEndingPlanPlanningWindow(
        JSON.stringify({
          planningWindow: {
            generatedAtChapterNumber: 30,
            validThroughChapterNumber: 38,
            estimatedRemainingChapterCount: 8,
          },
        }),
      ),
    ).toEqual({
      generatedAtChapterNumber: 30,
      validThroughChapterNumber: 38,
      estimatedRemainingChapterCount: 8,
    });

    expect(
      readEndingPlanPlanningWindow(
        JSON.stringify({
          project: {
            chapterWordMin: 5000,
            chapterWordMax: 8000,
          },
          readiness: {
            chapterCount: 30,
            finalChapterCount: 30,
            currentWords: 126000,
            targetWords: 150000,
          },
        }),
      ),
    ).toEqual({
      generatedAtChapterNumber: 30,
      validThroughChapterNumber: 38,
      estimatedRemainingChapterCount: 8,
    });
  });
});
