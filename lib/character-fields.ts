export const characterFieldNames = [
  "name",
  "roleInStory",
  "identity",
  "status",
  "speakingStyle",
  "desire",
  "fear",
  "secret",
  "relationToProtagonist",
  "relationToAntagonist",
  "knownInfo",
  "hiddenInfo",
  "abilityBoundary",
  "behaviorRules",
  "characterArc",
  "firstAppearance",
  "latestAppearance",
  "notes",
] as const;

export type CharacterFieldName = (typeof characterFieldNames)[number];

export type CharacterTextFieldName = Exclude<
  CharacterFieldName,
  "name" | "status"
>;

type CharacterField = {
  name: CharacterTextFieldName;
  label: string;
  placeholder: string;
  rows: number;
};

type CharacterFieldGroup = {
  title: string;
  description: string;
  fields: readonly CharacterField[];
};

export const characterStatusOptions = [
  {
    value: "active",
    label: "活跃",
  },
  {
    value: "inactive",
    label: "暂不出场",
  },
  {
    value: "archived",
    label: "已归档",
  },
] as const;

export const characterFieldGroups: readonly CharacterFieldGroup[] = [
  {
    title: "基础身份",
    description: "保存角色在故事里的稳定定位，方便后续章节生成时快速取用。",
    fields: [
      {
        name: "roleInStory",
        label: "故事定位",
        placeholder: "主角 / 反派 / 配角 / 导师 / 阶段对手",
        rows: 2,
      },
      {
        name: "identity",
        label: "身份背景",
        placeholder: "公开身份、社会位置、所属组织或隐藏身份。",
        rows: 3,
      },
      {
        name: "firstAppearance",
        label: "首次出场",
        placeholder: "计划首次出现的章节、场景或剧情节点。",
        rows: 2,
      },
      {
        name: "latestAppearance",
        label: "最近出场",
        placeholder: "最近一次出场章节或当前剧情位置。",
        rows: 2,
      },
    ],
  },
  {
    title: "动机与秘密",
    description: "记录角色真正驱动力，防止长篇连载中人物行为漂移。",
    fields: [
      {
        name: "desire",
        label: "核心欲望",
        placeholder: "角色最想得到、守住或证明的东西。",
        rows: 3,
      },
      {
        name: "fear",
        label: "恐惧",
        placeholder: "角色最害怕失去、暴露或再次经历的事情。",
        rows: 3,
      },
      {
        name: "secret",
        label: "秘密",
        placeholder: "只有作者知道或暂未向读者揭示的信息。",
        rows: 4,
      },
      {
        name: "characterArc",
        label: "人物弧光",
        placeholder: "角色从开始到后续阶段会经历怎样的变化。",
        rows: 4,
      },
    ],
  },
  {
    title: "关系与信息边界",
    description: "区分角色知道什么、隐瞒什么，以及和主线人物的关系。",
    fields: [
      {
        name: "relationToProtagonist",
        label: "与主角关系",
        placeholder: "同盟、债主、敌人、亲人、误解来源等。",
        rows: 3,
      },
      {
        name: "relationToAntagonist",
        label: "与反派关系",
        placeholder: "利益绑定、上下级、旧识、被利用或互相制衡。",
        rows: 3,
      },
      {
        name: "knownInfo",
        label: "已知信息",
        placeholder: "角色当前明确知道的事实、线索、秘密或误判。",
        rows: 4,
      },
      {
        name: "hiddenInfo",
        label: "隐藏信息",
        placeholder: "角色知道但没有公开、或作者暂时不让其他角色知道的信息。",
        rows: 4,
      },
    ],
  },
  {
    title: "表达与行为规则",
    description: "约束角色说话方式、能力边界和行为底线。",
    fields: [
      {
        name: "speakingStyle",
        label: "说话风格",
        placeholder: "口头禅、句式、语气、禁用表达、情绪外显方式。",
        rows: 4,
      },
      {
        name: "abilityBoundary",
        label: "能力边界",
        placeholder: "能力上限、代价、不能做什么、何时会失败。",
        rows: 4,
      },
      {
        name: "behaviorRules",
        label: "行为规则",
        placeholder: "遇到危险、诱惑、权力、感情或利益时的稳定反应。",
        rows: 4,
      },
      {
        name: "notes",
        label: "备注",
        placeholder: "其他作者备注、灵感、暂存桥段或后续提醒。",
        rows: 4,
      },
    ],
  },
] as const satisfies readonly CharacterFieldGroup[];

export const characterTextFields: readonly CharacterField[] =
  characterFieldGroups.flatMap((group) => group.fields);

export type CharacterValues = Record<CharacterFieldName, string>;

export function emptyCharacterValues(): CharacterValues {
  return Object.fromEntries(
    characterFieldNames.map((fieldName) => [fieldName, ""]),
  ) as CharacterValues;
}

export function characterValuesFromRecord(
  record?: Partial<Record<CharacterFieldName, string | null>> | null,
): CharacterValues {
  const values = emptyCharacterValues();

  if (!record) {
    return values;
  }

  for (const fieldName of characterFieldNames) {
    values[fieldName] = record[fieldName] ?? "";
  }

  return values;
}

export function characterSnapshot(values: CharacterValues): CharacterValues {
  const snapshot = emptyCharacterValues();

  for (const fieldName of characterFieldNames) {
    snapshot[fieldName] = values[fieldName]?.trim() ?? "";
  }

  return snapshot;
}
