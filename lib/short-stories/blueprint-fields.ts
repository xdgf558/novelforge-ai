export const shortStoryBlueprintFieldNames = [
  "premise",
  "openingHook",
  "protagonistPressure",
  "coreConflict",
  "reversalChain",
  "emotionalArc",
  "climax",
  "ending",
  "requiredPayoffs",
  "forbiddenDeviations",
] as const;

export type ShortStoryBlueprintFieldName =
  (typeof shortStoryBlueprintFieldNames)[number];

export type ShortStoryBlueprintValues = Record<
  ShortStoryBlueprintFieldName,
  string
>;

type ShortStoryBlueprintField = {
  name: ShortStoryBlueprintFieldName;
  label: string;
  placeholder: string;
  rows: number;
};

type ShortStoryBlueprintGroup = {
  title: string;
  description: string;
  fields: readonly ShortStoryBlueprintField[];
};

export const shortStoryBlueprintGroups: readonly ShortStoryBlueprintGroup[] = [
  {
    title: "故事承诺",
    description: "先锁定读者为什么点开、主角为什么不能退出，以及冲突怎样成立。",
    fields: [
      {
        name: "premise",
        label: "核心前提",
        placeholder: "一句话说明人物、异常处境和故事承诺。",
        rows: 3,
      },
      {
        name: "openingHook",
        label: "开篇钩子",
        placeholder: "前 300-800 字必须出现的异常、危险或不可逆选择。",
        rows: 3,
      },
      {
        name: "protagonistPressure",
        label: "主角压力",
        placeholder: "主角正在失去什么，为什么现在必须行动。",
        rows: 4,
      },
      {
        name: "coreConflict",
        label: "核心冲突",
        placeholder: "主角目标、阻力、代价与对手逻辑构成的冲突闭环。",
        rows: 4,
      },
    ],
  },
  {
    title: "推进与收束",
    description: "用有限篇幅安排升级、反转、情绪变化和最终兑现。",
    fields: [
      {
        name: "reversalChain",
        label: "反转链",
        placeholder: "按因果顺序列出关键揭示、误判修正和局势翻转。",
        rows: 6,
      },
      {
        name: "emotionalArc",
        label: "情绪曲线",
        placeholder: "从开篇到结尾的情绪压力、释放与余味。",
        rows: 5,
      },
      {
        name: "climax",
        label: "高潮",
        placeholder: "主角必须作出的最终选择，以及选择带来的即时结果。",
        rows: 5,
      },
      {
        name: "ending",
        label: "结局",
        placeholder: "核心冲突如何闭环，人物和读者最终得到什么答案。",
        rows: 5,
      },
    ],
  },
  {
    title: "兑现与边界",
    description: "把必须回收的承诺和不能偏离的方向固定下来。",
    fields: [
      {
        name: "requiredPayoffs",
        label: "必须兑现",
        placeholder: "逐条列出开篇承诺、线索、人物关系和情绪债的回收要求。",
        rows: 6,
      },
      {
        name: "forbiddenDeviations",
        label: "禁止偏离",
        placeholder: "不可新增的支线、不能改变的设定、禁用套路和内容边界。",
        rows: 6,
      },
    ],
  },
];

export function shortStoryBlueprintValuesFromRecord(
  record?: Partial<Record<ShortStoryBlueprintFieldName, unknown>> | null,
): ShortStoryBlueprintValues {
  return Object.fromEntries(
    shortStoryBlueprintFieldNames.map((fieldName) => {
      const value = record?.[fieldName];

      return [fieldName, typeof value === "string" ? value.trim() : ""];
    }),
  ) as ShortStoryBlueprintValues;
}

export function shortStoryBlueprintSnapshot(
  values: Partial<ShortStoryBlueprintValues>,
): ShortStoryBlueprintValues {
  return shortStoryBlueprintValuesFromRecord(values);
}

export function hasShortStoryBlueprintContent(
  values?: Partial<
    Record<ShortStoryBlueprintFieldName, string | null | undefined>
  > | null,
) {
  return shortStoryBlueprintFieldNames.some((fieldName) =>
    Boolean(values?.[fieldName]?.trim()),
  );
}

export function shortStoryBlueprintCompletedFieldCount(
  values?: Partial<ShortStoryBlueprintValues> | null,
) {
  return shortStoryBlueprintFieldNames.filter((fieldName) =>
    Boolean(values?.[fieldName]?.trim()),
  ).length;
}

export function shortStoryBlueprintFieldLabel(
  fieldName: ShortStoryBlueprintFieldName,
) {
  return (
    shortStoryBlueprintGroups
      .flatMap((group) => group.fields)
      .find((field) => field.name === fieldName)?.label ?? fieldName
  );
}

export function formatShortStoryBlueprintForContext(
  record?: Partial<
    Record<ShortStoryBlueprintFieldName, string | null | undefined>
  > | null,
  maxFieldLength = 1600,
) {
  return shortStoryBlueprintFieldNames
    .map((fieldName) => {
      const value = record?.[fieldName]?.trim();

      if (!value) {
        return "";
      }

      const clipped =
        value.length > maxFieldLength
          ? `${value.slice(0, maxFieldLength)}...`
          : value;

      return `## ${shortStoryBlueprintFieldLabel(fieldName)}\n${clipped}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
