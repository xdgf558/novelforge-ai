export function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function formatNumber(value: number | null | undefined) {
  if (value == null) {
    return "未设置";
  }

  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatWordRange(min?: number | null, max?: number | null) {
  if (min && max) {
    return `${formatNumber(min)}-${formatNumber(max)} 字`;
  }

  if (min) {
    return `至少 ${formatNumber(min)} 字`;
  }

  if (max) {
    return `最多 ${formatNumber(max)} 字`;
  }

  return "未设置";
}

