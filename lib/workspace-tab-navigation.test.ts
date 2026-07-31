import { describe, expect, it } from "vitest";
import { resolveWorkspaceTabId } from "./workspace-tab-navigation";

const tabs = [
  {
    id: "outline-ai",
  },
  {
    hashAliases: ["quick-create-outlines"],
    id: "outline-library",
  },
];

describe("workspace tab hash resolution", () => {
  it("resolves a tab's own hash", () => {
    expect(resolveWorkspaceTabId(tabs, "outline-ai")).toBe("outline-ai");
  });

  it("resolves a nested anchor to its containing tab", () => {
    expect(resolveWorkspaceTabId(tabs, "quick-create-outlines")).toBe(
      "outline-library",
    );
  });

  it("leaves unknown and empty hashes unresolved", () => {
    expect(resolveWorkspaceTabId(tabs, "missing-anchor")).toBeNull();
    expect(resolveWorkspaceTabId(tabs, "")).toBeNull();
  });
});
