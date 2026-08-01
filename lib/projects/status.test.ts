import { describe, expect, it } from "vitest";
import {
  isProjectInArchiveDirectory,
  normalizeProjectStatus,
  projectStatusLabel,
} from "./status";

describe("project status", () => {
  it("keeps legacy and unknown states on the active path", () => {
    expect(normalizeProjectStatus()).toBe("active");
    expect(normalizeProjectStatus("legacy")).toBe("active");
    expect(projectStatusLabel("legacy")).toBe("进行中");
  });

  it("distinguishes completed projects from manually archived projects", () => {
    expect(projectStatusLabel("completed")).toBe("已完结");
    expect(projectStatusLabel("archived")).toBe("已归档");
    expect(isProjectInArchiveDirectory("completed")).toBe(true);
    expect(isProjectInArchiveDirectory("archived")).toBe(true);
    expect(isProjectInArchiveDirectory("active")).toBe(false);
  });
});
