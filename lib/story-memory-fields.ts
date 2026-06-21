export const worldRuleStatusOptions = [
  { value: "active", label: "生效中" },
  { value: "draft", label: "草案" },
  { value: "archived", label: "已归档" },
] as const;

export const worldRuleCategoryOptions = [
  { value: "power_system", label: "力量体系" },
  { value: "social_rule", label: "社会规则" },
  { value: "economy_rule", label: "经济规则" },
  { value: "organization_rule", label: "组织规则" },
  { value: "geography_rule", label: "地理规则" },
  { value: "technology_rule", label: "科技规则" },
  { value: "law_rule", label: "法律规则" },
  { value: "taboo_rule", label: "禁忌规则" },
  { value: "cost_mechanism", label: "代价机制" },
  { value: "information_rule", label: "信息传播规则" },
  { value: "other", label: "其他" },
] as const;

export const memoryRiskLevelOptions = [
  { value: "low", label: "低风险" },
  { value: "medium", label: "中风险" },
  { value: "high", label: "高风险" },
] as const;

export const foreshadowStatusOptions = [
  { value: "planted", label: "未回收" },
  { value: "advancing", label: "推进中" },
  { value: "resolved", label: "已回收" },
  { value: "abandoned", label: "废弃" },
  { value: "needs_attention", label: "需要处理" },
] as const;

export const foreshadowImportanceOptions = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
] as const;

export const timelineEventStatusOptions = [
  { value: "active", label: "生效中" },
  { value: "archived", label: "已归档" },
] as const;

export const storyMemoryValidationErrorMessages = {
  invalidForm: "表单内容不完整，请检查必填字段。",
  missingTitle: "标题不能为空，请填写标题后再保存。",
  missingContent: "正文内容不能为空，请填写内容后再保存。",
  bodyTooLong: "内容过长，请压缩到允许长度内再保存。",
  invalidExpectedResolveChapter: "预计回收章节必须是大于 0 的整数。",
  invalidChapterReference: "关联章节不属于当前项目，请重新选择章节。",
  recordNotFound: "没有找到这条结构化记忆记录。",
} as const;

export type StoryMemoryValidationErrorCode =
  keyof typeof storyMemoryValidationErrorMessages;

type Option = {
  value: string;
  label: string;
};

export function worldRuleStatusLabel(value?: string | null) {
  return optionLabel(worldRuleStatusOptions, value, "未设置");
}

export function worldRuleCategoryLabel(value?: string | null) {
  return optionLabel(worldRuleCategoryOptions, value, value || "未分类");
}

export function memoryRiskLevelLabel(value?: string | null) {
  return optionLabel(memoryRiskLevelOptions, value, "中风险");
}

export function foreshadowStatusLabel(value?: string | null) {
  return optionLabel(foreshadowStatusOptions, value, "未回收");
}

export function foreshadowImportanceLabel(value?: string | null) {
  return optionLabel(foreshadowImportanceOptions, value, "中");
}

export function timelineEventStatusLabel(value?: string | null) {
  return optionLabel(timelineEventStatusOptions, value, "生效中");
}

export function normalizeWorldRuleStatus(value: unknown) {
  return normalizeOption(worldRuleStatusOptions, value, "active");
}

export function normalizeWorldRuleCategory(value: unknown) {
  return normalizeOption(worldRuleCategoryOptions, value, "other");
}

export function normalizeRiskLevel(value: unknown) {
  return normalizeOption(memoryRiskLevelOptions, value, "medium");
}

export function normalizeForeshadowStatus(value: unknown) {
  return normalizeOption(foreshadowStatusOptions, value, "planted");
}

export function normalizeForeshadowImportance(value: unknown) {
  return normalizeOption(foreshadowImportanceOptions, value, "medium");
}

export function normalizeTimelineEventStatus(value: unknown) {
  return normalizeOption(timelineEventStatusOptions, value, "active");
}

function optionLabel(
  options: readonly Option[],
  value: string | null | undefined,
  fallback: string,
) {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

function normalizeOption<T extends readonly Option[]>(
  options: T,
  value: unknown,
  fallback: T[number]["value"],
) {
  if (typeof value !== "string") {
    return fallback;
  }

  return options.some((option) => option.value === value)
    ? (value as T[number]["value"])
    : fallback;
}
