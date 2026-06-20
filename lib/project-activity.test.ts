import { describe, expect, it } from "vitest";
import { latestDate, parseSqliteDate } from "./project-activity";

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

describe("parseSqliteDate", () => {
  it("parses SQLite timestamp strings as UTC dates", () => {
    expect(parseSqliteDate("2026-06-18 12:10:20")).toEqual(
      new Date("2026-06-18T12:10:20.000Z"),
    );
  });

  it("parses millisecond timestamps stored as numbers or strings", () => {
    const expectedDate = new Date("2026-06-18T11:42:07.815Z");

    expect(parseSqliteDate(1781782927815)).toEqual(expectedDate);
    expect(parseSqliteDate("1781782927815")).toEqual(expectedDate);
  });

  it("ignores invalid date values", () => {
    expect(parseSqliteDate("not-a-date")).toBeNull();
    expect(parseSqliteDate(null)).toBeNull();
  });
});
