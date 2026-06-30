export function pendingUpdateTaskReviewLabel(
  statuses: readonly string[],
): string {
  if (statuses.length === 0) {
    return "无待审核更新";
  }

  const pendingCount = statuses.filter((status) => status === "pending").length;

  if (pendingCount > 0) {
    return `待审核 ${pendingCount} 条`;
  }

  const approvedCount = statuses.filter(
    (status) => status === "approved",
  ).length;
  const rejectedCount = statuses.filter(
    (status) => status === "rejected",
  ).length;

  if (approvedCount > 0 && rejectedCount > 0) {
    return `已处理 ${approvedCount + rejectedCount} 条`;
  }

  if (approvedCount > 0) {
    return `已批准 ${approvedCount} 条`;
  }

  if (rejectedCount > 0) {
    return `已拒绝 ${rejectedCount} 条`;
  }

  return "已处理";
}
