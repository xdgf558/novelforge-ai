export const projectSettingFieldNames = [
  "genre",
  "targetAudience",
  "sellingPoint",
  "mainConflict",
  "protagonistDesire",
  "protagonistFlaw",
  "villainLogic",
  "supportingCharacters",
  "factions",
  "worldviewRules",
  "timeline",
  "pleasureMechanism",
  "longTermForeshadowing",
  "endingDirection",
  "styleSample",
  "wechatPositioning",
  "emotionalTone",
  "readerExpectation",
  "commercialHook",
  "forbiddenItems",
  "sensitiveContentRules",
] as const;

export type ProjectSettingFieldName = (typeof projectSettingFieldNames)[number];

type ProjectSettingField = {
  name: ProjectSettingFieldName;
  label: string;
  placeholder: string;
  rows: number;
};

type ProjectSettingGroup = {
  title: string;
  description: string;
  fields: readonly ProjectSettingField[];
};

export const projectSettingGroups: readonly ProjectSettingGroup[] = [
  {
    title: "核心定位",
    description: "确定作品面向谁、讲什么、靠什么吸引追更。",
    fields: [
      {
        name: "genre",
        label: "题材",
        placeholder: "都市异能 / 玄幻 / 悬疑",
        rows: 2,
      },
      {
        name: "targetAudience",
        label: "目标读者",
        placeholder: "微信公众号男性读者",
        rows: 2,
      },
      {
        name: "sellingPoint",
        label: "一句话卖点",
        placeholder: "一个普通人发现寿命可以被交易，从此被卷入地下契约网络。",
        rows: 3,
      },
      {
        name: "mainConflict",
        label: "主线矛盾",
        placeholder: "主角想摆脱借命契约，但幕后组织需要他继续偿还代价。",
        rows: 4,
      },
    ],
  },
  {
    title: "人物与势力",
    description: "约束主角、反派、配角和势力关系，防止人物动机漂移。",
    fields: [
      {
        name: "protagonistDesire",
        label: "主角欲望",
        placeholder: "主角真正想要得到什么。",
        rows: 3,
      },
      {
        name: "protagonistFlaw",
        label: "主角缺陷",
        placeholder: "主角必须克服的性格弱点或行为惯性。",
        rows: 3,
      },
      {
        name: "villainLogic",
        label: "反派逻辑",
        placeholder: "反派为什么这样行动，他的利益和底线是什么。",
        rows: 4,
      },
      {
        name: "supportingCharacters",
        label: "主要配角",
        placeholder: "配角姓名、身份、与主角的关系和阶段作用。",
        rows: 5,
      },
      {
        name: "factions",
        label: "势力关系",
        placeholder: "组织、家族、公司、宗门等势力关系。",
        rows: 5,
      },
    ],
  },
  {
    title: "世界与剧情规则",
    description: "保存长篇故事的硬规则、节奏机制、时间线和伏笔方向。",
    fields: [
      {
        name: "worldviewRules",
        label: "世界观规则",
        placeholder: "力量体系、代价机制、信息传播、社会规则等。",
        rows: 6,
      },
      {
        name: "timeline",
        label: "时间线",
        placeholder: "故事开始前的重要历史、当前阶段、未来关键节点。",
        rows: 5,
      },
      {
        name: "pleasureMechanism",
        label: "爽点机制",
        placeholder: "反转、打脸、升级、破局、情绪释放等规则。",
        rows: 4,
      },
      {
        name: "longTermForeshadowing",
        label: "长期伏笔方向",
        placeholder: "需要跨章节埋设和回收的关键谜题。",
        rows: 4,
      },
      {
        name: "endingDirection",
        label: "结局方向",
        placeholder: "最终关系、世界状态、主角完成的变化。",
        rows: 3,
      },
    ],
  },
  {
    title: "发布与风格约束",
    description: "面向公众号发布、文风稳定和敏感内容规避。",
    fields: [
      {
        name: "styleSample",
        label: "文风样例",
        placeholder: "可以粘贴一小段期望文风，后续生成正文时作为风格参考。",
        rows: 6,
      },
      {
        name: "wechatPositioning",
        label: "公众号发布定位",
        placeholder: "标题风格、开头钩子、读者预期、互动语气。",
        rows: 4,
      },
      {
        name: "emotionalTone",
        label: "情绪基调",
        placeholder: "压抑、热血、轻松、悬疑、爽感密集等。",
        rows: 3,
      },
      {
        name: "readerExpectation",
        label: "读者期待",
        placeholder: "读者每章最期待看到的内容和节奏。",
        rows: 3,
      },
      {
        name: "commercialHook",
        label: "商业卖点",
        placeholder: "最容易被标题、简介和开篇放大的卖点。",
        rows: 3,
      },
      {
        name: "forbiddenItems",
        label: "禁写事项",
        placeholder: "不允许出现的设定、表达、桥段或价值观风险。",
        rows: 4,
      },
      {
        name: "sensitiveContentRules",
        label: "敏感内容规避规则",
        placeholder: "公众号发布前需要规避或弱化的表达。",
        rows: 4,
      },
    ],
  },
] as const satisfies readonly ProjectSettingGroup[];

export const projectSettingFields: readonly ProjectSettingField[] = projectSettingGroups.flatMap(
  (group) => group.fields,
);

export type ProjectSettingValues = Record<ProjectSettingFieldName, string>;

export function emptyProjectSettingValues(): ProjectSettingValues {
  return Object.fromEntries(
    projectSettingFields.map((field) => [field.name, ""]),
  ) as ProjectSettingValues;
}

export function projectSettingValuesFromRecord(
  record?: Partial<Record<ProjectSettingFieldName, string | null>> | null,
): ProjectSettingValues {
  const values = emptyProjectSettingValues();

  if (!record) {
    return values;
  }

  for (const field of projectSettingFields) {
    values[field.name] = record[field.name] ?? "";
  }

  return values;
}

export function projectSettingSnapshot(values: ProjectSettingValues) {
  return projectSettingFields.reduce<Record<string, string>>((snapshot, field) => {
    snapshot[field.name] = values[field.name]?.trim() ?? "";
    return snapshot;
  }, {});
}
