import {
  characterFieldNames,
  type CharacterFieldName,
  emptyCharacterValues,
  type CharacterValues,
} from "./character-fields";
import {
  projectSettingFieldNames,
  type ProjectSettingFieldName,
} from "./project-setting-fields";

export const pendingUpdateStatusOptions = [
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已批准" },
  { value: "rejected", label: "已拒绝" },
] as const;

export const pendingUpdateRiskOptions = [
  { value: "low", label: "低风险" },
  { value: "medium", label: "中风险" },
  { value: "high", label: "高风险" },
] as const;

export const pendingUpdateTargetOptions = [
  { value: "project_setting", label: "总设定档" },
  { value: "character", label: "角色档案" },
  { value: "world_rule", label: "世界规则" },
  { value: "foreshadow", label: "伏笔" },
  { value: "timeline_event", label: "时间线" },
  { value: "location", label: "地点" },
  { value: "organization", label: "组织" },
] as const;

export const pendingUpdateTypeOptions = [
  { value: "create", label: "新增" },
  { value: "update", label: "更新" },
  { value: "resolve", label: "回收/解决" },
] as const;

export type PendingUpdateStatus = (typeof pendingUpdateStatusOptions)[number]["value"];
export type PendingUpdateRisk = (typeof pendingUpdateRiskOptions)[number]["value"];
export type PendingUpdateTargetType =
  (typeof pendingUpdateTargetOptions)[number]["value"];
export type PendingUpdateType = (typeof pendingUpdateTypeOptions)[number]["value"];

const highRiskPattern =
  /高风险|high|critical|核心|世界观|主角|反派|禁写|能力边界|时间线冲突|前文冲突/i;

const lowRiskPattern = /低风险|low|minor|补充|备注/i;

export function pendingUpdateStatusLabel(status?: string | null) {
  return (
    pendingUpdateStatusOptions.find((option) => option.value === status)?.label ??
    "未知"
  );
}

export function pendingUpdateRiskLabel(riskLevel?: string | null) {
  return (
    pendingUpdateRiskOptions.find((option) => option.value === riskLevel)?.label ??
    "未知风险"
  );
}

export function pendingUpdateTargetLabel(targetType?: string | null) {
  return (
    pendingUpdateTargetOptions.find((option) => option.value === targetType)
      ?.label ?? "未知目标"
  );
}

export function pendingUpdateTypeLabel(updateType?: string | null) {
  return (
    pendingUpdateTypeOptions.find((option) => option.value === updateType)?.label ??
    "更新"
  );
}

export function normalizeRiskLevel(value?: string | null): PendingUpdateRisk {
  const cleaned = clean(value).toLowerCase();

  if (!cleaned) {
    return "medium";
  }

  if (highRiskPattern.test(cleaned)) {
    return "high";
  }

  if (lowRiskPattern.test(cleaned)) {
    return "low";
  }

  if (cleaned === "medium" || cleaned === "中" || cleaned === "中风险") {
    return "medium";
  }

  return "medium";
}

export function normalizeTargetType(
  value?: string | null,
): PendingUpdateTargetType {
  const cleaned = clean(value).toLowerCase();

  if (["setting", "project_setting", "设定", "总设定档"].includes(cleaned)) {
    return "project_setting";
  }

  if (["character", "人物", "角色", "角色档案"].includes(cleaned)) {
    return "character";
  }

  if (["world_rule", "worldrule", "世界规则", "世界观规则"].includes(cleaned)) {
    return "world_rule";
  }

  if (["foreshadow", "伏笔"].includes(cleaned)) {
    return "foreshadow";
  }

  if (["timeline", "timeline_event", "时间线", "时间线事件"].includes(cleaned)) {
    return "timeline_event";
  }

  if (["location", "地点"].includes(cleaned)) {
    return "location";
  }

  if (["organization", "组织", "势力"].includes(cleaned)) {
    return "organization";
  }

  return "project_setting";
}

export function normalizeUpdateType(value?: string | null): PendingUpdateType {
  const cleaned = clean(value).toLowerCase();

  if (["create", "新增", "新建"].includes(cleaned)) {
    return "create";
  }

  if (["resolve", "resolved", "回收", "解决"].includes(cleaned)) {
    return "resolve";
  }

  return "update";
}

export function isProjectSettingFieldName(
  fieldName?: string | null,
): fieldName is ProjectSettingFieldName {
  return projectSettingFieldNames.includes(fieldName as ProjectSettingFieldName);
}

export function isCharacterFieldName(
  fieldName?: string | null,
): fieldName is CharacterFieldName {
  return characterFieldNames.includes(fieldName as CharacterFieldName);
}

export function inferProjectSettingFieldName(
  title: string,
  content: string,
): ProjectSettingFieldName {
  const text = `${title}\n${content}`;

  if (/禁写|敏感|风险|红线/.test(text)) {
    return "forbiddenItems";
  }

  if (/时间线|年代|过去|当前阶段|未来节点/.test(text)) {
    return "timeline";
  }

  if (/伏笔|谜题|线索/.test(text)) {
    return "longTermForeshadowing";
  }

  if (/反派|幕后|敌人/.test(text)) {
    return "villainLogic";
  }

  if (/主角|欲望|动机/.test(text)) {
    return "protagonistDesire";
  }

  if (/势力|组织|公司|家族|宗门/.test(text)) {
    return "factions";
  }

  if (/文风|语气|表达/.test(text)) {
    return "styleSample";
  }

  return "worldviewRules";
}

export function appendMemoryNote(currentValue: string | null | undefined, note: string) {
  const cleanedCurrent = clean(currentValue);
  const cleanedNote = clean(note);

  if (!cleanedNote) {
    return cleanedCurrent;
  }

  if (!cleanedCurrent) {
    return cleanedNote;
  }

  if (cleanedCurrent.includes(cleanedNote)) {
    return cleanedCurrent;
  }

  return `${cleanedCurrent}\n\n${cleanedNote}`;
}

export function characterValuesForPendingUpdate({
  targetName,
  title,
  fieldName,
  proposedContent,
}: {
  targetName?: string | null;
  title: string;
  fieldName: CharacterFieldName;
  proposedContent: string;
}): CharacterValues {
  const values = emptyCharacterValues();
  values.name = clean(targetName) || clean(title);
  values.status = "active";
  values[fieldName] = clean(proposedContent);

  return values;
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}
