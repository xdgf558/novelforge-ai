export const outlineLevels = ["volume", "unit", "chapter"] as const;

export type OutlineLevel = (typeof outlineLevels)[number];

export const outlineLevelOptions: readonly {
  value: OutlineLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "volume",
    label: "卷大纲",
    description: "定义一卷的目标、主线推进、核心冲突和高潮。",
  },
  {
    value: "unit",
    label: "剧情单元大纲",
    description: "定义一段连续剧情的起止章节、核心事件和爽点设计。",
  },
  {
    value: "chapter",
    label: "章节大纲",
    description: "定义单章目标、冲突、爽点、伏笔、地点和章末钩子。",
  },
];

export const outlineStatusOptions = [
  { value: "planned", label: "计划中" },
  { value: "active", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "archived", label: "已归档" },
] as const;

export type OutlineStatus = (typeof outlineStatusOptions)[number]["value"];

export const outlineTextFieldNames = [
  "content",
  "goal",
  "mainlineProgression",
  "mainConflict",
  "mainAntagonist",
  "keyTurns",
  "climax",
  "coreEvents",
  "characterChanges",
  "pleasureDesign",
  "suspenseDesign",
  "chapterConflict",
  "chapterPleasurePoint",
  "foreshadow",
  "resolvedForeshadow",
  "characters",
  "location",
  "endingHook",
] as const;

export const outlineNumberFieldNames = [
  "volumeNumber",
  "unitNumber",
  "chapterNumber",
  "startChapter",
  "endChapter",
  "expectedChapters",
  "expectedWords",
  "sortOrder",
] as const;

export type OutlineTextFieldName = (typeof outlineTextFieldNames)[number];
export type OutlineNumberFieldName = (typeof outlineNumberFieldNames)[number];

export type OutlineValues = {
  level: OutlineLevel;
  title: string;
  status: OutlineStatus;
} & Record<OutlineTextFieldName, string> &
  Record<OutlineNumberFieldName, number | null>;

export type OutlineLike = {
  id?: string;
  level?: string | null;
  status?: string | null;
  title?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
} & Partial<Record<OutlineTextFieldName, string | null>> &
  Partial<Record<OutlineNumberFieldName, number | null>>;

export const outlineNumberFields: readonly {
  name: OutlineNumberFieldName;
  label: string;
  levels: readonly OutlineLevel[];
  min?: number;
}[] = [
  {
    name: "volumeNumber",
    label: "卷号",
    levels: ["volume", "unit"],
    min: 1,
  },
  {
    name: "unitNumber",
    label: "单元号",
    levels: ["unit"],
    min: 1,
  },
  {
    name: "chapterNumber",
    label: "章节号",
    levels: ["chapter"],
    min: 1,
  },
  {
    name: "startChapter",
    label: "起始章节",
    levels: ["volume", "unit"],
    min: 1,
  },
  {
    name: "endChapter",
    label: "结束章节",
    levels: ["volume", "unit"],
    min: 1,
  },
  {
    name: "expectedChapters",
    label: "预计章节数",
    levels: ["volume"],
    min: 1,
  },
  {
    name: "expectedWords",
    label: "预计字数",
    levels: ["volume", "chapter"],
    min: 1,
  },
];

export const outlineTextFields: readonly {
  name: OutlineTextFieldName;
  label: string;
  levels: readonly OutlineLevel[];
  rows: number;
  placeholder: string;
}[] = [
  {
    name: "goal",
    label: "目标",
    levels: ["volume", "unit", "chapter"],
    rows: 4,
    placeholder: "这一卷 / 单元 / 章节要完成的剧情功能。",
  },
  {
    name: "mainlineProgression",
    label: "主线推进",
    levels: ["volume"],
    rows: 4,
    placeholder: "这一卷要把主线推到哪里。",
  },
  {
    name: "mainConflict",
    label: "核心冲突",
    levels: ["volume"],
    rows: 3,
    placeholder: "本卷最重要的外部矛盾或内在矛盾。",
  },
  {
    name: "mainAntagonist",
    label: "主要对手",
    levels: ["volume"],
    rows: 3,
    placeholder: "本卷对手、阻力或敌对阵营。",
  },
  {
    name: "keyTurns",
    label: "关键转折",
    levels: ["volume"],
    rows: 4,
    placeholder: "列出本卷的几次关键反转或阶段性转折。",
  },
  {
    name: "climax",
    label: "高潮",
    levels: ["volume"],
    rows: 3,
    placeholder: "本卷高潮事件和情绪释放点。",
  },
  {
    name: "coreEvents",
    label: "核心事件",
    levels: ["unit"],
    rows: 4,
    placeholder: "这个剧情单元必须发生的事件。",
  },
  {
    name: "characterChanges",
    label: "角色变化",
    levels: ["unit"],
    rows: 4,
    placeholder: "角色关系、立场、认知或能力的变化。",
  },
  {
    name: "pleasureDesign",
    label: "爽点设计",
    levels: ["unit", "chapter"],
    rows: 4,
    placeholder: "这一段给读者的爽点、期待满足或情绪回报。",
  },
  {
    name: "suspenseDesign",
    label: "悬念设计",
    levels: ["unit"],
    rows: 4,
    placeholder: "这一段的悬念、误导或追读钩子。",
  },
  {
    name: "chapterConflict",
    label: "章节冲突",
    levels: ["chapter"],
    rows: 3,
    placeholder: "这一章的当场冲突或阻碍。",
  },
  {
    name: "chapterPleasurePoint",
    label: "章节爽点",
    levels: ["chapter"],
    rows: 3,
    placeholder: "这一章最明确的爽点或情绪释放。",
  },
  {
    name: "foreshadow",
    label: "埋设伏笔",
    levels: ["chapter"],
    rows: 3,
    placeholder: "本章要埋下的新伏笔。",
  },
  {
    name: "resolvedForeshadow",
    label: "回收伏笔",
    levels: ["chapter"],
    rows: 3,
    placeholder: "本章要回收或推进的旧伏笔。",
  },
  {
    name: "characters",
    label: "出场角色",
    levels: ["chapter"],
    rows: 3,
    placeholder: "本章主要出场人物。",
  },
  {
    name: "location",
    label: "地点",
    levels: ["chapter"],
    rows: 2,
    placeholder: "本章主要场景。",
  },
  {
    name: "endingHook",
    label: "章末钩子",
    levels: ["chapter"],
    rows: 3,
    placeholder: "本章结尾留下的悬念、问题或下一章入口。",
  },
  {
    name: "content",
    label: "补充备注",
    levels: ["volume", "unit", "chapter"],
    rows: 5,
    placeholder: "其他暂时不适合结构化字段的规划内容。",
  },
];

const emptyTextValues = Object.fromEntries(
  outlineTextFieldNames.map((name) => [name, ""]),
) as Record<OutlineTextFieldName, string>;

const emptyNumberValues = Object.fromEntries(
  outlineNumberFieldNames.map((name) => [name, null]),
) as Record<OutlineNumberFieldName, number | null>;

export function outlineValuesFromRecord(
  record?: (Partial<OutlineValues> | OutlineLike) | null,
) {
  return {
    level: normalizeOutlineLevel(record?.level),
    title: record?.title?.trim() ?? "",
    status: normalizeOutlineStatus(record?.status),
    ...emptyTextValues,
    ...emptyNumberValues,
    ...Object.fromEntries(
      outlineTextFieldNames.map((name) => [name, record?.[name]?.trim() ?? ""]),
    ),
    ...Object.fromEntries(
      outlineNumberFieldNames.map((name) => [name, normalizeNumber(record?.[name])]),
    ),
  } satisfies OutlineValues;
}

export function outlineSnapshot(values: OutlineValues) {
  return {
    level: values.level,
    title: values.title.trim(),
    status: values.status,
    sortOrder: values.sortOrder ?? inferOutlineSortOrder(values),
    content: optionalText(values.content),
    volumeNumber: values.volumeNumber,
    unitNumber: values.unitNumber,
    chapterNumber: values.chapterNumber,
    startChapter: values.startChapter,
    endChapter: values.endChapter,
    expectedChapters: values.expectedChapters,
    expectedWords: values.expectedWords,
    goal: optionalText(values.goal),
    mainlineProgression: optionalText(values.mainlineProgression),
    mainConflict: optionalText(values.mainConflict),
    mainAntagonist: optionalText(values.mainAntagonist),
    keyTurns: optionalText(values.keyTurns),
    climax: optionalText(values.climax),
    coreEvents: optionalText(values.coreEvents),
    characterChanges: optionalText(values.characterChanges),
    pleasureDesign: optionalText(values.pleasureDesign),
    suspenseDesign: optionalText(values.suspenseDesign),
    chapterConflict: optionalText(values.chapterConflict),
    chapterPleasurePoint: optionalText(values.chapterPleasurePoint),
    foreshadow: optionalText(values.foreshadow),
    resolvedForeshadow: optionalText(values.resolvedForeshadow),
    characters: optionalText(values.characters),
    location: optionalText(values.location),
    endingHook: optionalText(values.endingHook),
  };
}

export function outlineLevelLabel(level?: string | null) {
  return (
    outlineLevelOptions.find((option) => option.value === level)?.label ?? "大纲"
  );
}

export function outlineStatusLabel(status?: string | null) {
  return (
    outlineStatusOptions.find((option) => option.value === status)?.label ??
    "计划中"
  );
}

export function outlineRangeLabel(outline: OutlineLike | Partial<OutlineValues>) {
  if (normalizeOutlineLevel(outline.level) === "chapter" && outline.chapterNumber) {
    return `第 ${outline.chapterNumber} 章`;
  }

  const start = outline.startChapter;
  const end = outline.endChapter;

  if (start && end) {
    return `第 ${start}-${end} 章`;
  }

  if (start) {
    return `第 ${start} 章起`;
  }

  if (end) {
    return `至第 ${end} 章`;
  }

  return "章节范围未设置";
}

export function inferOutlineSortOrder(values: Partial<OutlineValues>) {
  if (values.level === "chapter") {
    return values.chapterNumber ?? 0;
  }

  return values.startChapter ?? values.unitNumber ?? values.volumeNumber ?? 0;
}

export function selectRelevantOutlinesForChapter(
  outlines: readonly OutlineLike[],
  chapterNumber: number,
) {
  const byLevel = new Map<OutlineLevel, OutlineLike>();

  for (const outline of outlines) {
    const level = normalizeOutlineLevel(outline.level);

    if (!outlineMatchesChapter(outline, chapterNumber)) {
      continue;
    }

    if (!byLevel.has(level)) {
      byLevel.set(level, outline);
    }
  }

  return outlineLevels
    .map((level) => byLevel.get(level))
    .filter((outline): outline is OutlineLike => Boolean(outline));
}

export function outlineMatchesChapter(
  outline: OutlineLike | Partial<OutlineValues>,
  chapterNumber: number,
) {
  if (normalizeOutlineLevel(outline.level) === "chapter") {
    return outline.chapterNumber === chapterNumber;
  }

  const start = outline.startChapter;
  const end = outline.endChapter;

  if (start && end) {
    return chapterNumber >= start && chapterNumber <= end;
  }

  if (start) {
    return chapterNumber >= start;
  }

  if (end) {
    return chapterNumber <= end;
  }

  return false;
}

export function normalizeOutlineLevel(value?: string | null): OutlineLevel {
  return outlineLevels.includes(value as OutlineLevel)
    ? (value as OutlineLevel)
    : "volume";
}

export function normalizeOutlineStatus(value?: string | null): OutlineStatus {
  const statuses = outlineStatusOptions.map((option) => option.value);
  return statuses.includes(value as OutlineStatus)
    ? (value as OutlineStatus)
    : "planned";
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function optionalText(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}
