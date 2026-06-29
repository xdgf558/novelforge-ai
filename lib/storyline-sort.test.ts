import { describe, expect, it } from "vitest";
import { sortStorylines } from "./storyline-sort";

describe("storyline sorting", () => {
  it("keeps active storylines ahead of newer completed or archived storylines", () => {
    const sorted = sortStorylines([
      {
        id: "completed-new",
        status: "completed",
        updatedAt: new Date("2026-06-29T10:00:00Z"),
      },
      {
        id: "archived-new",
        status: "archived",
        updatedAt: new Date("2026-06-29T11:00:00Z"),
      },
      {
        id: "active-old",
        status: "active",
        updatedAt: new Date("2026-06-28T10:00:00Z"),
      },
      {
        id: "planned",
        status: "planned",
        updatedAt: new Date("2026-06-29T09:00:00Z"),
      },
    ]);

    expect(sorted.map((storyline) => storyline.id)).toEqual([
      "active-old",
      "planned",
      "completed-new",
      "archived-new",
    ]);
  });
});
