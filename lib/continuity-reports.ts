export const continuitySeverityOptions = [
  { value: "low", label: "低风险" },
  { value: "medium", label: "中风险" },
  { value: "high", label: "高风险" },
  { value: "critical", label: "严重" },
] as const;

export const continuityStatusOptions = [
  { value: "open", label: "待处理" },
  { value: "resolved", label: "已处理" },
] as const;

export const continuityCategoryOptions = [
  { value: "character_knowledge", label: "人物认知" },
  { value: "character_behavior", label: "人物性格" },
  { value: "world_rule", label: "世界规则" },
  { value: "timeline", label: "时间线" },
  { value: "foreshadow", label: "伏笔" },
  { value: "plot_logic", label: "剧情逻辑" },
  { value: "forbidden_item", label: "禁写事项" },
  { value: "publishing_risk", label: "发布风险" },
  { value: "general", label: "综合问题" },
] as const;

export type ContinuitySeverity =
  (typeof continuitySeverityOptions)[number]["value"];
export type ContinuityStatus = (typeof continuityStatusOptions)[number]["value"];
export type ContinuityCategory =
  (typeof continuityCategoryOptions)[number]["value"];

export function continuitySeverityLabel(severity?: string | null) {
  return (
    continuitySeverityOptions.find((option) => option.value === severity)?.label ??
    "未知风险"
  );
}

export function continuityStatusLabel(status?: string | null) {
  return (
    continuityStatusOptions.find((option) => option.value === status)?.label ??
    "未知状态"
  );
}

export function continuityCategoryLabel(category?: string | null) {
  return (
    continuityCategoryOptions.find((option) => option.value === category)?.label ??
    "综合问题"
  );
}

export function normalizeContinuitySeverity(
  value?: string | null,
): ContinuitySeverity {
  const cleaned = clean(value).toLowerCase();

  if (!cleaned) {
    return "medium";
  }

  if (/critical|严重|致命|阻塞/.test(cleaned)) {
    return "critical";
  }

  if (/high|高|核心|重大|冲突/.test(cleaned)) {
    return "high";
  }

  if (/low|低|轻微|提示/.test(cleaned)) {
    return "low";
  }

  return "medium";
}

export function normalizeContinuityCategory(
  value?: string | null,
): ContinuityCategory {
  const cleaned = clean(value).toLowerCase();

  if (/knowledge|认知|知道|信息边界/.test(cleaned)) {
    return "character_knowledge";
  }

  if (/behavior|personality|性格|行为|说话|降智/.test(cleaned)) {
    return "character_behavior";
  }

  if (/world|rule|设定|世界观|规则|能力|力量/.test(cleaned)) {
    return "world_rule";
  }

  if (/timeline|time|时间|顺序|先后/.test(cleaned)) {
    return "timeline";
  }

  if (/foreshadow|伏笔|线索|回收/.test(cleaned)) {
    return "foreshadow";
  }

  if (/forbidden|禁写|敏感|红线/.test(cleaned)) {
    return "forbidden_item";
  }

  if (/publish|wechat|公众号|发布/.test(cleaned)) {
    return "publishing_risk";
  }

  if (/plot|logic|剧情|主线|开挂|衔接/.test(cleaned)) {
    return "plot_logic";
  }

  return "general";
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}
