import { describe, expect, it } from "vitest";
import { latestDate } from "./project-activity";

describe("latestDate", () => {
  it("returns the newest date while ignoring empty values", () => {
    expect(
      latestDate([
        null,
        new Date("2026-06-18T11:42:00.000Z"),
        undefined,
        new Date("2026-06-20T02:24:52.000Z"),
        new Date("2026-06-19T14:05:00.000Z"),
      ]),
    ).toEqual(new Date("2026-06-20T02:24:52.000Z"));
  });

  it("returns null when there are no dates", () => {
    expect(latestDate([null, undefined])).toBeNull();
  });
});
