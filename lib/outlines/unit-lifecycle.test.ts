import { describe, expect, it } from "vitest";
import { findNextUnitPlanningReminder } from "./unit-lifecycle";

const chapters = [
  { chapterNumber: 1, status: "published" },
  { chapterNumber: 2, status: "final" },
];

describe("story unit lifecycle", () => {
  it("suggests the next chapter after every current unit is completed", () => {
    expect(
      findNextUnitPlanningReminder({
        chapters,
        outlines: [
          {
            level: "volume",
            status: "active",
            startChapter: 1,
            endChapter: 30,
          },
          {
            level: "unit",
            status: "active",
            startChapter: 1,
            endChapter: 2,
          },
        ],
        readyToFinish: false,
      }),
    ).toEqual({
      completedUnitCount: 1,
      nextChapterNumber: 3,
    });
  });

  it("does not skip ahead to the end of a broader volume range", () => {
    expect(
      findNextUnitPlanningReminder({
        chapters,
        outlines: [
          {
            level: "volume",
            status: "active",
            startChapter: 1,
            endChapter: 46,
          },
          {
            level: "unit",
            status: "active",
            startChapter: 1,
            endChapter: 2,
          },
        ],
        readyToFinish: false,
      })?.nextChapterNumber,
    ).toBe(3);
  });

  it("waits while any unit is unfinished", () => {
    expect(
      findNextUnitPlanningReminder({
        chapters,
        outlines: [
          {
            level: "unit",
            status: "completed",
            startChapter: 1,
            endChapter: 2,
          },
          {
            level: "unit",
            status: "planned",
            startChapter: 3,
            endChapter: 4,
          },
        ],
        readyToFinish: false,
      }),
    ).toBeNull();
  });

  it("suppresses next-unit planning when the project is ready to finish", () => {
    expect(
      findNextUnitPlanningReminder({
        chapters,
        outlines: [
          {
            level: "unit",
            status: "completed",
            startChapter: 1,
            endChapter: 2,
          },
        ],
        readyToFinish: true,
      }),
    ).toBeNull();
  });
});
