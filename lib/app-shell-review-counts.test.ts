import { describe, expect, it } from "vitest";
import { buildAppShellReviewCounts } from "@/lib/app-shell-review-counts";

describe("app shell review counts", () => {
  it("keeps each review count attached to its own project", () => {
    const result = buildAppShellReviewCounts(
      [
        { id: "project-a", title: "项目 A" },
        { id: "project-b", title: "项目 B" },
      ],
      [
        { projectId: "project-a", _count: { _all: 3 } },
        { projectId: "project-b", _count: { _all: 1 } },
      ],
      [{ projectId: "project-b", _count: { _all: 2 } }],
    );

    expect(result).toEqual([
      {
        projectId: "project-a",
        projectTitle: "项目 A",
        pendingUpdateCount: 3,
        openContinuityCount: 0,
      },
      {
        projectId: "project-b",
        projectTitle: "项目 B",
        pendingUpdateCount: 1,
        openContinuityCount: 2,
      },
    ]);
  });

  it("keeps continuity-only projects visible", () => {
    expect(
      buildAppShellReviewCounts(
        [{ id: "project-a", title: "项目 A" }],
        [],
        [{ projectId: "project-a", _count: { _all: 4 } }],
      ),
    ).toEqual([
      {
        projectId: "project-a",
        projectTitle: "项目 A",
        pendingUpdateCount: 0,
        openContinuityCount: 4,
      },
    ]);
  });
});
