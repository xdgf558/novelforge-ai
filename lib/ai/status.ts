import activeAiTaskStatusValues from "./active-task-statuses.json";

export const aiTaskStatusOptions = [
  { value: "pending", label: "待执行" },
  { value: "running", label: "执行中" },
  { value: "completed", label: "已完成" },
  { value: "failed", label: "失败" },
  { value: "cancelled", label: "已取消" },
] as const;

export type AiTaskStatus = (typeof aiTaskStatusOptions)[number]["value"];
export type ActiveAiTaskStatus = Extract<
  AiTaskStatus,
  "pending" | "running"
>;

export const activeAiTaskStatuses =
  activeAiTaskStatusValues as readonly ActiveAiTaskStatus[];

export const aiTaskAdoptionOptions = [
  { value: "not_reviewed", label: "未审阅" },
  { value: "adopted", label: "已采纳" },
  { value: "edited", label: "编辑后采纳" },
  { value: "rejected", label: "已拒绝" },
] as const;

export function aiTaskStatusLabel(status?: string | null) {
  return (
    aiTaskStatusOptions.find((option) => option.value === status)?.label ??
    "未知"
  );
}

export function isActiveAiTaskStatus(status?: string | null) {
  return activeAiTaskStatuses.some((activeStatus) => activeStatus === status);
}

export function aiTaskAdoptionLabel(adoptionState?: string | null) {
  return (
    aiTaskAdoptionOptions.find((option) => option.value === adoptionState)
      ?.label ?? "未知"
  );
}
