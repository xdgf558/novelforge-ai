export const characterRelationshipTypeOptions = [
  { value: "family", label: "亲属" },
  { value: "ally", label: "同盟" },
  { value: "partner", label: "搭档" },
  { value: "mentor", label: "师徒" },
  { value: "rival", label: "竞争" },
  { value: "enemy", label: "敌对" },
  { value: "romantic", label: "情感" },
  { value: "business", label: "商业" },
  { value: "secret", label: "隐秘" },
  { value: "other", label: "其他" },
] as const;

export const characterRelationshipStatusOptions = [
  { value: "active", label: "活跃" },
  { value: "tension", label: "紧张" },
  { value: "hidden", label: "隐藏" },
  { value: "resolved", label: "已解决" },
  { value: "archived", label: "已归档" },
] as const;

export const characterRelationshipDirectionOptions = [
  { value: "two_way", label: "双向关系" },
  { value: "source_to_target", label: "前者指向后者" },
  { value: "target_to_source", label: "后者指向前者" },
  { value: "unclear", label: "暂不明确" },
] as const;

export type CharacterRelationshipType =
  (typeof characterRelationshipTypeOptions)[number]["value"];

export type CharacterRelationshipStatus =
  (typeof characterRelationshipStatusOptions)[number]["value"];

export type CharacterRelationshipDirection =
  (typeof characterRelationshipDirectionOptions)[number]["value"];

export const characterRelationshipErrorMessages: Record<string, string> = {
  invalidForm: "人物关系表单内容不完整，请检查必填字段。",
  missingCharacter: "请选择关系两端的人物。",
  sameCharacter: "人物关系两端不能是同一个角色。",
  invalidCharacterReference: "人物关系引用了当前项目外的角色。",
  archivedCharacterReference: "不能为已归档角色新建人物关系；如需维护历史关系，请编辑已有记录。",
  invalidChapterReference: "人物关系引用了当前项目外的章节。",
  missingSummary: "请填写人物关系摘要。",
  bodyTooLong: "人物关系内容过长，请压缩后再保存。",
  recordNotFound: "没有找到这条人物关系记录。",
  invalidCharacterDraft: "AI 人物草案无法解析为可创建的角色。",
  invalidCharacterRequest: "人物生成需求过长或格式不正确，请压缩后再生成。",
  activeCharacterTask: "已有 AI 人物生成任务进行中，请等待完成后再生成。",
  activeRelationshipTask: "已有 AI 人物关系生成任务进行中，请等待完成后再生成。",
  missingApiKey: "未配置 API Key，暂不能调用模型；已有任务仍可查看和采用。",
  notEnoughCharacters: "至少需要两个未归档角色，才能生成或采用人物关系草案。",
  invalidRelationshipDraft: "AI 人物关系草案无法解析为可采用的正式关系。",
  duplicateRelationship: "这两个角色之间已存在相同类型和方向的活跃关系，请编辑已有关系或先归档旧关系。",
  adoptedNoRelationships: "没有可写入的新关系：草案可能已重复、缺少角色或引用了已归档角色。",
};

export function normalizeRelationshipType(
  value?: string | null,
): CharacterRelationshipType {
  return normalizeOption(
    value,
    characterRelationshipTypeOptions,
    "other",
  );
}

export function normalizeRelationshipStatus(
  value?: string | null,
): CharacterRelationshipStatus {
  return normalizeOption(
    value,
    characterRelationshipStatusOptions,
    "active",
  );
}

export function normalizeRelationshipDirection(
  value?: string | null,
): CharacterRelationshipDirection {
  return normalizeOption(
    value,
    characterRelationshipDirectionOptions,
    "two_way",
  );
}

export function relationshipTypeLabel(value?: string | null) {
  return optionLabel(characterRelationshipTypeOptions, value, "其他");
}

export function relationshipStatusLabel(value?: string | null) {
  return optionLabel(characterRelationshipStatusOptions, value, "未知");
}

export function relationshipDirectionLabel(value?: string | null) {
  return optionLabel(characterRelationshipDirectionOptions, value, "双向关系");
}

function normalizeOption<
  T extends readonly { value: string; label: string }[],
  Fallback extends T[number]["value"],
>(value: string | null | undefined, options: T, fallback: Fallback) {
  const normalized = value?.trim();

  if (normalized && options.some((option) => option.value === normalized)) {
    return normalized as T[number]["value"];
  }

  return fallback;
}

function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
  fallback: string,
) {
  return options.find((option) => option.value === value)?.label ?? fallback;
}
