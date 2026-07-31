export type ContinuityReviewStatus = "open" | "resolved";

export type ContinuityReviewContext = {
  page: number;
  reportId?: string;
  status: ContinuityReviewStatus;
};

type ContinuityReviewResult = {
  name: "fix" | "patch";
  value: string;
};

export function buildContinuityReviewHref(
  projectId: string,
  context: ContinuityReviewContext,
  result?: ContinuityReviewResult,
) {
  const query = new URLSearchParams();

  if (result) {
    query.set(result.name, result.value);
  }

  query.set("status", context.status);
  query.set("page", String(parsePositiveInt(context.page) ?? 1));

  const reportId = context.reportId?.trim();

  if (reportId) {
    query.set("reportId", reportId);
  }

  return `/projects/${projectId}/continuity?${query.toString()}${
    reportId ? `#report-${encodeURIComponent(reportId)}` : ""
  }`;
}

export function readContinuityReviewContext(
  formData: FormData,
  fallback: ContinuityReviewContext,
): ContinuityReviewContext {
  const returnStatus = formData.get("returnStatus");
  const returnPage = formData.get("returnPage");
  const returnReportId = formData.get("returnReportId");

  return {
    page:
      typeof returnPage === "string"
        ? (parsePositiveInt(returnPage) ?? fallback.page)
        : fallback.page,
    reportId:
      typeof returnReportId === "string" && returnReportId.trim()
        ? returnReportId.trim()
        : fallback.reportId,
    status:
      returnStatus === "open" || returnStatus === "resolved"
        ? returnStatus
        : fallback.status,
  };
}

function parsePositiveInt(value: string | number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
