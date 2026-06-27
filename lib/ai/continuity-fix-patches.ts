import { clipText } from "./chapter-beats";

export const continuityFixPatchTemplateKey = "continuity_fix_patch_generation";
export const continuityFixPatchTaskType = "continuity_fix_patch_generation";

export type ContinuityFixPatchProjectContext = {
  title: string;
  genre?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
};

export type ContinuityFixPatchReportContext = {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  evidence?: string | null;
  conflictingMemory?: string | null;
  suggestedFix?: string | null;
};

export type ContinuityFixPatchChapterContext = {
  id: string;
  chapterNumber: number;
  title: string;
  status?: string | null;
  goal?: string | null;
  beats?: string | null;
  draftText?: string | null;
  polishedText?: string | null;
  finalText?: string | null;
  notes?: string | null;
};

export type ContinuityFixPatchContextInput = {
  project: ContinuityFixPatchProjectContext;
  report: ContinuityFixPatchReportContext;
  chapter: ContinuityFixPatchChapterContext;
};

export type ContinuityFixPatchSource = {
  fieldName: "finalText" | "polishedText" | "draftText";
  label: string;
  text: string;
};

export type BuiltContinuityFixPatchContext = {
  inputContextSummary: string;
  inputJson: Record<string, unknown>;
  inputText: string;
  source: ContinuityFixPatchSource;
};

const sourceExcerptMaxLength = 14000;
const sourceExcerptSideLength = 6500;
const sourcePreviewMaxLength = 1200;

export function buildContinuityFixPatchContext(
  input: ContinuityFixPatchContextInput,
): BuiltContinuityFixPatchContext {
  const source = selectContinuityFixPatchSource(input.chapter);

  if (!source) {
    throw new Error("缺少可用于生成修复候选的章节正文。");
  }

  const sourceExcerpt = buildSourceExcerpt({
    text: source.text,
    evidence: input.report.evidence,
    description: input.report.description,
    suggestedFix: input.report.suggestedFix,
  });

  const inputJson = {
    project: {
      title: input.project.title,
      genre: clean(input.project.genre),
      targetAudience: clean(input.project.targetAudience),
      platform: clean(input.project.platform),
    },
    report: {
      id: input.report.id,
      severity: input.report.severity,
      category: input.report.category,
      title: input.report.title,
      description: input.report.description,
      evidence: clean(input.report.evidence),
      conflictingMemory: clean(input.report.conflictingMemory),
      suggestedFix: clean(input.report.suggestedFix),
    },
    chapter: {
      id: input.chapter.id,
      chapterNumber: input.chapter.chapterNumber,
      title: input.chapter.title,
      status: clean(input.chapter.status),
      goal: clipText(input.chapter.goal, 800),
      beats: clipText(input.chapter.beats, 1200),
      notes: clipText(input.chapter.notes, 800),
      sourceField: source.fieldName,
      sourceLabel: source.label,
      sourceTextLength: source.text.length,
      sourceTextPreview: clipText(source.text, sourcePreviewMaxLength),
      sourceExcerptLength: sourceExcerpt.text.length,
      sourceExcerptWasClipped: sourceExcerpt.wasClipped,
      sourceExcerptStrategy: sourceExcerpt.strategy,
    },
    outputRequirements: [
      "只生成修复候选补丁，不得宣称已经修改正文。",
      "优先给出可人工核对的精确查找/替换候选。",
      "如果问题需要重写桥段或更换信息源，给出改写方案和候选片段，不要编造成已完成。",
      "不能自动修改正式设定、角色、时间线、伏笔或章节正文。",
    ],
  };

  const inputText = [
    "# 任务",
    "根据连续性检查报告，为作者生成一份可审阅的“修复候选补丁”。",
    "重要：你只提供候选补丁。不要说“已修复”“已修改”“已写入”。正式正文只能由作者确认后手动整理或使用系统的一键精确替换。",
    "",
    "# 输出格式",
    "请用 Markdown 输出，并包含以下小节：",
    "## 修复摘要",
    "简述问题和推荐修法。",
    "## 精确替换候选",
    "如能安全定位，请列出 1-5 条：查找原文、替换为、原因。查找原文必须来自章节正文摘录，不能凭空捏造。",
    "## 改写候选片段",
    "如果无法只靠替换解决，请给出可粘贴进正文的短片段，并说明应放在什么位置。",
    "## 作者核对点",
    "列出作者采用前必须确认的 2-4 个事实边界。",
    "",
    "# 项目",
    lines([
      ["项目", input.project.title],
      ["题材", input.project.genre],
      ["目标读者", input.project.targetAudience],
      ["平台", input.project.platform],
    ]),
    "",
    "# 关联章节",
    lines([
      [
        "章节",
        `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》`,
      ],
      ["状态", input.chapter.status],
      ["章节目标", input.chapter.goal],
      ["当前修复源", source.label],
      ["修复源长度", `${source.text.length} 字`],
    ]),
    "",
    "# 连续性报告",
    lines([
      ["严重度", input.report.severity],
      ["分类", input.report.category],
      ["标题", input.report.title],
      ["问题描述", input.report.description],
      ["证据", input.report.evidence],
      ["冲突记忆", input.report.conflictingMemory],
      ["建议修复", input.report.suggestedFix],
    ]),
    "",
    "# 章节上下文",
    lines([
      ["章节节拍", clipText(input.chapter.beats, 1600)],
      ["作者备注", clipText(input.chapter.notes, 1200)],
    ]),
    "",
    "# 当前章节正文摘录",
    sourceExcerpt.wasClipped
      ? `以下是按“${sourceExcerpt.strategy}”截取的正文片段。没有出现在摘录中的内容不得当作确定事实。`
      : "以下是当前修复源全文。",
    "",
    sourceExcerpt.text || "未提供正文。",
  ].join("\n");

  return {
    inputContextSummary: buildContinuityFixPatchContextSummary(input, source),
    inputJson,
    inputText,
    source,
  };
}

export function selectContinuityFixPatchSource(
  chapter: ContinuityFixPatchChapterContext,
): ContinuityFixPatchSource | null {
  const finalText = clean(chapter.finalText);

  if (finalText) {
    return {
      fieldName: "finalText",
      label: "定稿正文",
      text: finalText,
    };
  }

  const polishedText = clean(chapter.polishedText);

  if (polishedText) {
    return {
      fieldName: "polishedText",
      label: "精修正文",
      text: polishedText,
    };
  }

  const draftText = clean(chapter.draftText);

  if (draftText) {
    return {
      fieldName: "draftText",
      label: "草稿正文",
      text: draftText,
    };
  }

  return null;
}

export function readContinuityFixPatchReportId(inputJson?: string | null) {
  if (!inputJson?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(inputJson) as {
      report?: {
        id?: unknown;
      };
    };

    return typeof parsed.report?.id === "string" ? parsed.report.id : null;
  } catch {
    return null;
  }
}

function buildContinuityFixPatchContextSummary(
  input: ContinuityFixPatchContextInput,
  source: ContinuityFixPatchSource,
) {
  return [
    `第 ${input.chapter.chapterNumber} 章《${input.chapter.title}》连续性修复候选`,
    `${input.report.severity} / ${input.report.category}`,
    `修复源：${source.label} ${source.text.length} 字`,
  ].join("；");
}

function buildSourceExcerpt({
  text,
  evidence,
  description,
  suggestedFix,
}: {
  text: string;
  evidence?: string | null;
  description?: string | null;
  suggestedFix?: string | null;
}) {
  const sourceText = clean(text);

  if (sourceText.length <= sourceExcerptMaxLength) {
    return {
      strategy: "full_text",
      text: sourceText,
      wasClipped: false,
    };
  }

  const evidenceIndex = findEvidenceIndex(sourceText, [
    evidence,
    description,
    suggestedFix,
  ]);

  if (evidenceIndex >= 0) {
    const start = Math.max(0, evidenceIndex - sourceExcerptSideLength);
    const end = Math.min(sourceText.length, evidenceIndex + sourceExcerptSideLength);
    const prefix = start > 0 ? "...【前文省略】\n" : "";
    const suffix = end < sourceText.length ? "\n...【后文省略】" : "";

    return {
      strategy: "evidence_window",
      text: `${prefix}${sourceText.slice(start, end).trim()}${suffix}`,
      wasClipped: true,
    };
  }

  const head = sourceText.slice(0, sourceExcerptSideLength).trim();
  const tail = sourceText.slice(-sourceExcerptSideLength).trim();

  return {
    strategy: "head_tail",
    text: `${head}\n\n...【中段省略】...\n\n${tail}`,
    wasClipped: true,
  };
}

function findEvidenceIndex(text: string, candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const lines = clean(candidate)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 18);

    for (const line of lines) {
      const fullIndex = text.indexOf(line);

      if (fullIndex >= 0) {
        return fullIndex;
      }

      const shorterLine = line.slice(0, 80);
      const shortIndex = text.indexOf(shorterLine);

      if (shortIndex >= 0) {
        return shortIndex;
      }
    }
  }

  return -1;
}

function lines(items: Array<[string, string | number | null | undefined]>) {
  return items
    .map(([label, value]) => `- ${label}: ${clean(value) || "未提供"}`)
    .join("\n");
}

function clean(value?: string | number | null) {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}
