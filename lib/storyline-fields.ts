export const storylineTypeOptions = [
  { value: "mainline", label: "主线" },
  { value: "subplot", label: "支线" },
  { value: "character_arc", label: "角色线" },
  { value: "business_line", label: "商业线" },
  { value: "romance_line", label: "感情线" },
  { value: "antagonist_line", label: "反派线" },
  { value: "foreshadow_line", label: "伏笔线" },
  { value: "world_line", label: "世界线" },
  { value: "other", label: "其他" },
] as const;

export const storylineStatusOptions = [
  { value: "planned", label: "计划中" },
  { value: "active", label: "推进中" },
  { value: "paused", label: "暂缓" },
  { value: "completed", label: "已完成" },
  { value: "archived", label: "已归档" },
] as const;

export const storylineValidationErrorMessages = {
  invalidForm: "故事线表单内容不完整，请检查名称、章节范围和文本长度。",
  invalidRange: "故事线结束章节不能小于起始章节。",
  invalidRelation: "关联项不属于当前项目，请刷新后重试。",
  duplicateStoryline: "已存在同名、同类型、同章节范围的故事线，请勿重复保存候选。",
  recordNotFound: "没有找到这条故事线，可能已被删除或归档。",
} as const;

export type StorylineValidationErrorCode =
  keyof typeof storylineValidationErrorMessages;

export type StorylineType = (typeof storylineTypeOptions)[number]["value"];
export type StorylineStatus =
  (typeof storylineStatusOptions)[number]["value"];

export function storylineTypeLabel(value?: string | null) {
  return optionLabel(storylineTypeOptions, value, "其他");
}

export function storylineStatusLabel(value?: string | null) {
  return optionLabel(storylineStatusOptions, value, "计划中");
}

export function normalizeStorylineType(value?: string | null): StorylineType {
  return normalizeOption(storylineTypeOptions, value, "mainline");
}

export function normalizeStorylineStatus(
  value?: string | null,
): StorylineStatus {
  return normalizeOption(storylineStatusOptions, value, "active");
}

function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
  fallback: string,
) {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

function normalizeOption<T extends readonly { value: string }[]>(
  options: T,
  value: string | null | undefined,
  fallback: T[number]["value"],
) {
  return options.some((option) => option.value === value)
    ? (value as T[number]["value"])
    : fallback;
}
