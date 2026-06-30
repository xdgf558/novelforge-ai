import { describe, expect, it } from "vitest";

import { pendingUpdateTaskReviewLabel } from "./chapter-task-review";

describe("pendingUpdateTaskReviewLabel", () => {
  it("shows no pending updates when extraction produced no suggestions", () => {
    expect(pendingUpdateTaskReviewLabel([])).toBe("无待审核更新");
  });

  it("prioritizes remaining pending items", () => {
    expect(
      pendingUpdateTaskReviewLabel(["approved", "pending", "rejected"]),
    ).toBe("待审核 1 条");
  });

  it("summarizes fully approved update suggestions", () => {
    expect(pendingUpdateTaskReviewLabel(["approved", "approved"])).toBe(
      "已批准 2 条",
    );
  });

  it("summarizes mixed processed update suggestions", () => {
    expect(pendingUpdateTaskReviewLabel(["approved", "rejected"])).toBe(
      "已处理 2 条",
    );
  });
});
