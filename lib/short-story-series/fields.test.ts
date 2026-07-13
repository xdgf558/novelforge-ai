import { describe, expect, it } from "vitest";
import {
  moveSeriesEntryOrder,
  nextSeriesSortOrder,
  shortStorySeriesCharacterStatusLabel,
  shortStorySeriesStatusLabel,
} from "./fields";

describe("short story series fields", () => {
  it("labels known statuses and safely falls back", () => {
    expect(shortStorySeriesStatusLabel("completed")).toBe("已完结");
    expect(shortStorySeriesStatusLabel("unknown")).toBe("连载中");
    expect(shortStorySeriesCharacterStatusLabel("retired")).toBe("已退场");
  });

  it("appends new records after the current maximum sort order", () => {
    expect(nextSeriesSortOrder([])).toBe(10);
    expect(nextSeriesSortOrder([{ sortOrder: 30 }, { sortOrder: 10 }])).toBe(
      40,
    );
  });

  it("moves entries and normalizes their sort order", () => {
    const entries = [
      { id: "story_1", sortOrder: 4 },
      { id: "story_2", sortOrder: 4 },
      { id: "story_3", sortOrder: 90 },
    ];

    expect(moveSeriesEntryOrder(entries, "story_2", "down")).toEqual([
      { id: "story_1", sortOrder: 10 },
      { id: "story_3", sortOrder: 20 },
      { id: "story_2", sortOrder: 30 },
    ]);
    expect(moveSeriesEntryOrder(entries, "story_1", "up")).toEqual([
      { id: "story_1", sortOrder: 10 },
      { id: "story_2", sortOrder: 20 },
      { id: "story_3", sortOrder: 30 },
    ]);
  });
});
