export const chapterFieldNames = [
  "chapterNumber",
  "title",
  "status",
  "goal",
  "beats",
  "draftText",
  "finalText",
  "notes",
  "wordCount",
] as const;

export type ChapterFieldName = (typeof chapterFieldNames)[number];

type ChapterNumberFieldName = Extract<
  ChapterFieldName,
  "chapterNumber" | "wordCount"
>;

type ChapterStringFieldName = Exclude<ChapterFieldName, ChapterNumberFieldName>;

export type ChapterTextFieldName = Extract<
  ChapterFieldName,
  "goal" | "beats" | "draftText" | "finalText" | "notes"
>;

export type ChapterValues = Record<ChapterStringFieldName, string> &
  Record<ChapterNumberFieldName, number>;

export type ChapterRecord = Partial<
  Record<ChapterStringFieldName, string | null> &
    Record<ChapterNumberFieldName, number | null>
>;

const chapterNumberFieldNames = [
  "chapterNumber",
  "wordCount",
] as const satisfies readonly ChapterNumberFieldName[];

type ChapterTextField = {
  name: ChapterTextFieldName;
  label: string;
  placeholder: string;
  rows: number;
};

type ChapterFieldGroup = {
  title: string;
  description: string;
  fields: readonly ChapterTextField[];
};

export const chapterStatusOptions = [
  {
    value: "draft",
    label: "草稿",
  },
  {
    value: "revising",
    label: "修订中",
  },
  {
    value: "final",
    label: "已定稿",
  },
  {
    value: "published",
    label: "已发布",
  },
] as const;

export const chapterFieldGroups: readonly ChapterFieldGroup[] = [
  {
    title: "章节目标",
    description: "记录这一章要完成的剧情功能，后续 AI 节拍生成会优先参考这里。",
    fields: [
      {
        name: "goal",
        label: "章节目标",
        placeholder: "例如：主角第一次意识到借命契约不是偶然，而是有人故意安排。",
        rows: 4,
      },
      {
        name: "beats",
        label: "章节节拍",
        placeholder: "按顺序列出本章关键事件、情绪转折、结尾钩子。",
        rows: 8,
      },
    ],
  },
  {
    title: "正文内容",
    description: "先支持人工输入草稿与定稿，AI 生成正文会在后续 AI 服务阶段接入。",
    fields: [
      {
        name: "draftText",
        label: "草稿正文",
        placeholder: "这里保存章节草稿，可由作者手写或后续 AI 生成后再编辑。",
        rows: 14,
      },
      {
        name: "finalText",
        label: "定稿正文",
        placeholder: "确认后的正式正文。后续章节摘要、更新提取和连续性检查会以定稿为准。",
        rows: 14,
      },
    ],
  },
  {
    title: "作者备注",
    description: "保存这一章的临时提醒、修订计划和后续伏笔注意事项。",
    fields: [
      {
        name: "notes",
        label: "备注",
        placeholder: "例如：这一章结尾要留一个未解释的短信来源，后续第 5 章回收。",
        rows: 5,
      },
    ],
  },
] as const satisfies readonly ChapterFieldGroup[];

export const chapterTextFields: readonly ChapterTextField[] =
  chapterFieldGroups.flatMap((group) => group.fields);

export function chapterStatusLabel(status?: string | null) {
  return (
    chapterStatusOptions.find((option) => option.value === status)?.label ??
    "未知"
  );
}

export function countChapterWords(
  finalText?: string | null,
  draftText?: string | null,
) {
  const source = (finalText && finalText.trim() ? finalText : draftText) ?? "";
  return source.replace(/\s/g, "").length;
}

export function formatChapterWordCount(wordCount?: number | null) {
  if (wordCount == null || wordCount <= 0) {
    return "未统计";
  }

  return `${wordCount.toLocaleString("zh-CN")} 字`;
}

export function emptyChapterValues(): ChapterValues {
  return {
    chapterNumber: 1,
    title: "",
    status: "draft",
    goal: "",
    beats: "",
    draftText: "",
    finalText: "",
    notes: "",
    wordCount: 0,
  };
}

export function chapterValuesFromRecord(record?: ChapterRecord | null): ChapterValues {
  const values = emptyChapterValues();

  if (!record) {
    return values;
  }

  for (const fieldName of chapterFieldNames) {
    const recordValue = record[fieldName];

    if (recordValue == null) {
      continue;
    }

    if (isChapterNumberFieldName(fieldName)) {
      if (typeof recordValue === "number") {
        values[fieldName] = recordValue;
      }

      continue;
    }

    if (typeof recordValue === "string") {
      values[fieldName] = recordValue;
    }
  }

  return values;
}

export function chapterSnapshot(values: ChapterValues): ChapterValues {
  const snapshot = emptyChapterValues();

  snapshot.chapterNumber = values.chapterNumber;
  snapshot.title = values.title.trim();
  snapshot.status = values.status.trim();

  for (const field of chapterTextFields) {
    snapshot[field.name] = values[field.name]?.trim() ?? "";
  }

  snapshot.wordCount = countChapterWords(snapshot.finalText, snapshot.draftText);

  return snapshot;
}

function isChapterNumberFieldName(
  fieldName: ChapterFieldName,
): fieldName is ChapterNumberFieldName {
  return chapterNumberFieldNames.some(
    (numberFieldName) => numberFieldName === fieldName,
  );
}
