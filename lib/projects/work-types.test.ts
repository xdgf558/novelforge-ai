import { describe, expect, it } from "vitest";
import {
  defaultProjectWorkType,
  isShortStoryProject,
  normalizeProjectWorkType,
  projectToolPathsForWorkType,
  projectWorkTypeLabel,
} from "./work-types";

describe("project work types", () => {
  it("keeps legacy and unknown values on the serial-novel path", () => {
    expect(normalizeProjectWorkType()).toBe(defaultProjectWorkType);
    expect(normalizeProjectWorkType("legacy")).toBe("serial_novel");
    expect(projectWorkTypeLabel(null)).toBe("长篇连载");
  });

  it("recognizes short-story projects", () => {
    expect(normalizeProjectWorkType("short_story")).toBe("short_story");
    expect(projectWorkTypeLabel("short_story")).toBe("短故事");
    expect(isShortStoryProject("short_story")).toBe(true);
    expect(isShortStoryProject("serial_novel")).toBe(false);
  });

  it("keeps long-form-only tools out of the short-story workspace", () => {
    expect(projectToolPathsForWorkType("short_story")).toEqual([
      "",
      "blueprint",
      "settings",
      "characters",
      "chapters",
      "memory",
      "ai",
    ]);
    expect(projectToolPathsForWorkType("short_story")).not.toContain("outlines");
    expect(projectToolPathsForWorkType("short_story")).not.toContain("storylines");
    expect(projectToolPathsForWorkType("serial_novel")).toContain("outlines");
    expect(projectToolPathsForWorkType("serial_novel")).toContain("chapters");
  });
});
