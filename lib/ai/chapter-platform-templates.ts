export const chapterPlatformTemplateOptions = [
  {
    value: "default",
    label: "通用连载",
    description: "按项目原有设定、文风样例和章节节拍生成。",
  },
  {
    value: "fanqie",
    label: "番茄小说",
    description: "强化开篇冲突、信息推进、爽点反转和章末追读钩子。",
  },
] as const;

export type ChapterPlatformTemplate =
  (typeof chapterPlatformTemplateOptions)[number]["value"];

export function normalizeChapterPlatformTemplate(
  value: unknown,
): ChapterPlatformTemplate {
  return value === "fanqie" ? "fanqie" : "default";
}

export function chapterPlatformTemplateLabel(
  template: ChapterPlatformTemplate,
) {
  return (
    chapterPlatformTemplateOptions.find((option) => option.value === template)
      ?.label ?? chapterPlatformTemplateOptions[0].label
  );
}

export function buildChapterPlatformTemplateContext({
  task,
  template,
}: {
  task: "draft" | "polish";
  template?: unknown;
}) {
  const normalized = normalizeChapterPlatformTemplate(template);
  const label = chapterPlatformTemplateLabel(normalized);
  const instructions =
    normalized === "fanqie"
      ? task === "draft"
        ? fanqieDraftInstructions
        : fanqiePolishInstructions
      : [];

  return {
    template: normalized,
    label,
    instructions,
  };
}

const fanqieDraftInstructions = [
  "目标平台：番茄小说长篇连载。",
  "正文只输出小说正文，不输出创作说明、Markdown 标题、节拍标记、分镜说明。",
  "开篇 300 字内必须出现明确人物动作、冲突压力或悬念，不要长篇解释设定。",
  "每 800-1200 字推进一次有效信息：新线索、新阻碍、新选择、新误会、新收益或新风险。",
  "不要按一天一天或早中晚流水账推进；无新信息的过渡日直接跳过或一句带过。",
  "章节中段要有一次可感知的爽点或反转，但不能脱离角色能力边界。",
  "章尾保留追读钩子，可以是新麻烦、新秘密、新对手动作或人物关系变化。",
  "段落适合手机阅读，避免超长段落。",
  "对话要推动人物关系或剧情，不写空泛寒暄。",
  "不使用露骨、血腥、低俗、违法引导等高风险表达。",
  "不改变项目总设定、人物核心动机、时间线和既有事实。",
];

const fanqiePolishInstructions = [
  "目标平台：番茄小说长篇连载。",
  "保留原剧情、角色、时间线、关键信息和章节功能。",
  "清理 AI 腔、解释腔、总结腔，让正文更像自然网文连载。",
  "强化开篇钩子，让读者更快知道本章冲突。",
  "强化人物动作、对话潜台词和场景压力。",
  "压缩逐日流水账式过渡，保留必要时间锚点，把段落改成冲突链、线索链或人物选择链。",
  "保留或增强本章至少一个爽点、反转或情绪释放点。",
  "章尾增加追读感，但不能凭空制造与后文冲突的悬念。",
  "正文不输出 Markdown、标题、编号大纲、分析说明。",
  "保持手机阅读友好：短段落、节奏清楚、少大段设定解释。",
];
