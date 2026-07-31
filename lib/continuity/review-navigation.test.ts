import { describe, expect, it } from "vitest";
import {
  buildContinuityReviewHref,
  readContinuityReviewContext,
} from "./review-navigation";

describe("continuity review navigation", () => {
  it("keeps status, page, and report id in the server-visible query", () => {
    expect(
      buildContinuityReviewHref(
        "project_1",
        {
          page: 3,
          reportId: "report_9",
          status: "open",
        },
        { name: "patch", value: "started" },
      ),
    ).toBe(
      "/projects/project_1/continuity?patch=started&status=open&page=3&reportId=report_9#report-report_9",
    );
  });

  it("reads valid return state and rejects invalid status and page values", () => {
    const formData = new FormData();
    formData.set("returnStatus", "resolved");
    formData.set("returnPage", "4");
    formData.set("returnReportId", " report_4 ");

    expect(
      readContinuityReviewContext(formData, {
        page: 1,
        reportId: "fallback",
        status: "open",
      }),
    ).toEqual({
      page: 4,
      reportId: "report_4",
      status: "resolved",
    });

    formData.set("returnStatus", "deleted");
    formData.set("returnPage", "-2");

    expect(
      readContinuityReviewContext(formData, {
        page: 2,
        reportId: "fallback",
        status: "open",
      }),
    ).toEqual({
      page: 2,
      reportId: "report_4",
      status: "open",
    });
  });
});
