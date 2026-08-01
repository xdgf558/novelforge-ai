export const projectStatusValues = [
  "active",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof projectStatusValues)[number];

export function normalizeProjectStatus(value?: string | null): ProjectStatus {
  if (value === "completed" || value === "archived") {
    return value;
  }

  return "active";
}

export function projectStatusLabel(value?: string | null) {
  switch (normalizeProjectStatus(value)) {
    case "completed":
      return "已完结";
    case "archived":
      return "已归档";
    default:
      return "进行中";
  }
}

export function isProjectInArchiveDirectory(value?: string | null) {
  const status = normalizeProjectStatus(value);

  return status === "completed" || status === "archived";
}
