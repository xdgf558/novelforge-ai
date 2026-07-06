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

export function continuityCheckTaskReviewLabel(
  taskStatus: string,
  reportStatuses: readonly string[],
  adoptionStateLabel: string,
): string {
  if (taskStatus === "completed") {
    if (reportStatuses.length === 0) {
      return "无连续性问题";
    }

    const openCount = reportStatuses.filter((status) => status === "open").length;

    return openCount > 0
      ? `待处理 ${openCount} 条`
      : `已处理 ${reportStatuses.length} 条`;
  }

  if (taskStatus === "failed") {
    return "未生成报告";
  }

  return adoptionStateLabel;
}
