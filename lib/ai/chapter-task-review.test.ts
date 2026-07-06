import { describe, expect, it } from "vitest";

import {
  continuityCheckTaskReviewLabel,
  pendingUpdateTaskReviewLabel,
} from "./chapter-task-review";

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

describe("continuityCheckTaskReviewLabel", () => {
  it("shows no continuity issues when a completed task produced no reports", () => {
    expect(continuityCheckTaskReviewLabel("completed", [], "未审阅")).toBe(
      "无连续性问题",
    );
  });

  it("summarizes open continuity reports", () => {
    expect(
      continuityCheckTaskReviewLabel(
        "completed",
        ["resolved", "open", "open"],
        "未审阅",
      ),
    ).toBe("待处理 2 条");
  });

  it("keeps the adoption label for in-progress tasks", () => {
    expect(continuityCheckTaskReviewLabel("running", [], "未审阅")).toBe(
      "未审阅",
    );
  });
});
