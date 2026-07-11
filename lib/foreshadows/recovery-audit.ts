import { clipText } from "@/lib/ai/chapter-beats";

export const automaticForeshadowRecoverySource =
  "automatic_foreshadow_recovery_v1";

export type ForeshadowRecoveryAuditAction = "advance" | "resolve";
export type ForeshadowRecoveryAuditConfidence = "high" | "medium" | "low";

export type ForeshadowRecoveryAuditForeshadow = {
  id: string;
  content: string;
  status: string;
  importance: string;
  expectedResolveChapter?: number | null;
  plantedChapterId?: string | null;
  plantedChapterNumber?: number | null;
};

export type ForeshadowRecoveryChapterEvidence = {
  id: string;
  chapterNumber: number;
  title: string;
  summary: string;
  finalText?: string | null;
};

export type ForeshadowRecoverySignal = {
  targetId: string;
  action: ForeshadowRecoveryAuditAction;
  resolvedChapterId: string;
  summary: string;
  evidence: string;
  confidence: ForeshadowRecoveryAuditConfidence;
};

export type BuiltForeshadowRecoveryAuditContext = {
  inputText: string;
  inputJson: Record<string, unknown>;
  inputContextSummary: string;
};

const candidateContentLimit = 360;
const chapterEvidenceLimit = 700;

export function selectForeshadowsForChapterRecoveryAudit({
  chapterNumber,
  finalText,
  foreshadows,
  limit = 16,
}: {
  chapterNumber: number;
  finalText: string;
  foreshadows: readonly ForeshadowRecoveryAuditForeshadow[];
  limit?: number;
}) {
  return [...foreshadows]
    .filter((foreshadow) => isRecoverableStatus(foreshadow.status))
    .sort((left, right) => {
      return (
        mentionRank(left.content, finalText) - mentionRank(right.content, finalText) ||
        statusRank(left.status) - statusRank(right.status) ||
        expectedChapterRank(left.expectedResolveChapter, chapterNumber) -
          expectedChapterRank(right.expectedResolveChapter, chapterNumber) ||
        importanceRank(left.importance) - importanceRank(right.importance) ||
        left.content.localeCompare(right.content, "zh-Hans-CN")
      );
    })
    .slice(0, Math.max(0, limit));
}

export function buildForeshadowRecoveryAuditContext({
  chapters,
  foreshadows,
  projectTitle,
}: {
  chapters: readonly ForeshadowRecoveryChapterEvidence[];
  foreshadows: readonly ForeshadowRecoveryAuditForeshadow[];
  projectTitle: string;
}): BuiltForeshadowRecoveryAuditContext {
  const inputJson = {
    projectTitle,
    foreshadows: foreshadows.map((foreshadow) => ({
      id: foreshadow.id,
      content: clipText(foreshadow.content, candidateContentLimit),
      status: foreshadow.status,
      importance: foreshadow.importance,
      expectedResolveChapter: foreshadow.expectedResolveChapter ?? null,
      plantedChapterNumber: foreshadow.plantedChapterNumber ?? null,
    })),
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      summary: clipText(chapter.summary, chapterEvidenceLimit),
    })),
    outputRequirements: [
      "只判断候选列表中的伏笔，不得生成新伏笔。",
      "只有章节证据明确兑现伏笔核心问题时才能标记 resolve。",
      "仅有新线索、局部验证或继续铺垫时使用 advance。",
      "没有可靠证据的伏笔不要输出。",
      "targetId 与 resolvedChapterId 必须使用输入中的真实 ID。",
      "每条结果必须包含可核对的章节证据和置信度。",
    ],
  };
  const inputText = [
    "# 任务",
    `审计《${projectTitle}》的历史伏笔，判断哪些伏笔已经在后续正式章节中推进或完成回收。`,
    "结果只会生成待作者确认的回收候选，不得宣称已经修改正式伏笔池。",
    "",
    "# 待审计伏笔",
    foreshadows.length > 0
      ? foreshadows
          .map(
            (foreshadow) =>
              `- [${foreshadow.id}] ${clipText(foreshadow.content, candidateContentLimit)}（状态：${foreshadow.status}；重要度：${foreshadow.importance}；埋设章节：${foreshadow.plantedChapterNumber ?? "未指定"}；预计回收：${foreshadow.expectedResolveChapter ?? "未指定"}）`,
          )
          .join("\n")
      : "没有待审计伏笔。",
    "",
    "# 可引用的正式章节证据",
    chapters.length > 0
      ? chapters
          .map(
            (chapter) =>
              `- [${chapter.id}] 第 ${chapter.chapterNumber} 章《${chapter.title}》：${clipText(chapter.summary, chapterEvidenceLimit)}`,
          )
          .join("\n")
      : "没有可用的正式章节摘要。",
    "",
    "# 判断规则",
    "- resolve：伏笔提出的核心疑问已经被正文明确回答，或承诺的关键事件已经发生。",
    "- advance：正文只提供了新证据、排除部分可能、推进调查或强化悬念，尚未完整回答。",
    "- 不要把角色再次提到某个线索、重复展示物证或仍带猜测的推论误判为回收。",
    "- 只输出有明确证据的项目；其余伏笔留在池中，不要输出 unresolved。",
    "",
    "# 输出 JSON 字段",
    "- updates: 数组；每项包含 targetId, action, resolvedChapterId, summary, evidence, confidence。",
    "- action 只能是 advance 或 resolve。",
    "- confidence 只能是 high, medium, low。",
  ].join("\n");

  return {
    inputText,
    inputJson,
    inputContextSummary: `《${projectTitle}》历史伏笔回收审计；伏笔 ${foreshadows.length} 条；章节证据 ${chapters.length} 条`,
  };
}

export function parseForeshadowRecoverySignals(
  outputText?: string | null,
  fallbackChapterId?: string,
) {
  const parsed = parseJsonObject(outputText);

  if (!parsed) {
    return [];
  }

  const values = Array.isArray(parsed.foreshadowUpdates)
    ? parsed.foreshadowUpdates
    : Array.isArray(parsed.updates)
      ? parsed.updates
      : [];
  const signals = values.flatMap((value) => {
    if (!isRecord(value)) {
      return [];
    }

    const targetId = stringValue(value.targetId ?? value.target_id);
    const action = normalizeAction(value.action ?? value.updateType ?? value.update_type);
    const resolvedChapterId =
      stringValue(
        value.resolvedChapterId ??
          value.resolved_chapter_id ??
          value.chapterId ??
          value.chapter_id,
      ) || fallbackChapterId || "";
    const summary = stringValue(
      value.summary ?? value.content ?? value.proposedContent ?? value.reason,
    );
    const evidence = stringValue(
      value.evidence ?? value.sourceEvidence ?? value.source_evidence,
    );
    const confidence = normalizeConfidence(value.confidence);

    if (
      !targetId ||
      !action ||
      !resolvedChapterId ||
      !summary ||
      !evidence
    ) {
      return [];
    }

    return [
      {
        targetId,
        action,
        resolvedChapterId,
        summary,
        evidence,
        confidence,
      } satisfies ForeshadowRecoverySignal,
    ];
  });
  const deduplicated = new Map<string, ForeshadowRecoverySignal>();

  for (const signal of signals) {
    const existing = deduplicated.get(signal.targetId);

    if (!existing || recoverySignalRank(signal) < recoverySignalRank(existing)) {
      deduplicated.set(signal.targetId, signal);
    }
  }

  return [...deduplicated.values()];
}

export function compactChapterSummaryForRecovery(value?: string | null) {
  const parsed = parseJsonObject(value);

  if (!parsed) {
    return clipText(value, chapterEvidenceLimit);
  }

  const parts = [
    stringValue(parsed.shortSummary ?? parsed.short_summary),
    ...stringArray(parsed.mainEvents ?? parsed.main_events),
    ...stringArray(parsed.characterChanges ?? parsed.character_changes),
    ...stringArray(parsed.newForeshadows ?? parsed.new_foreshadows),
  ].filter(Boolean);

  return clipText(parts.join("；"), chapterEvidenceLimit);
}

export function buildAutomaticForeshadowRecoveryPayload(
  signal: ForeshadowRecoverySignal,
) {
  return JSON.stringify(
    {
      source: automaticForeshadowRecoverySource,
      action: signal.action,
      confidence: signal.confidence,
      resolvedChapterId: signal.resolvedChapterId,
    },
    null,
    2,
  );
}

export function parseAutomaticForeshadowRecoveryPayload(
  payloadJson?: string | null,
) {
  const payload = parseJsonObject(payloadJson);

  if (
    !payload ||
    payload.source !== automaticForeshadowRecoverySource ||
    !normalizeAction(payload.action)
  ) {
    return null;
  }

  return {
    source: automaticForeshadowRecoverySource,
    action: normalizeAction(payload.action) as ForeshadowRecoveryAuditAction,
    confidence: normalizeConfidence(payload.confidence),
    resolvedChapterId: stringValue(payload.resolvedChapterId),
  };
}

function isRecoverableStatus(status?: string | null) {
  return (
    status === "planted" ||
    status === "advancing" ||
    status === "needs_attention"
  );
}

function mentionRank(candidate: string, text: string) {
  if (!candidate.trim() || !text.trim()) {
    return 1;
  }

  return foreshadowTextOverlapScore(candidate, text) >= 2 ? 0 : 1;
}

export function foreshadowTextOverlapScore(candidate: string, text: string) {
  const cleanedCandidate = candidate.trim();
  const cleanedText = text.trim();

  if (!cleanedCandidate || !cleanedText) {
    return 0;
  }

  if (cleanedText.includes(cleanedCandidate)) {
    return 10_000;
  }

  const exactTermMatches = meaningfulTerms(cleanedCandidate).filter((term) =>
    cleanedText.includes(term),
  ).length;

  return exactTermMatches * 4 + sharedTrigramCount(
    cleanedCandidate,
    cleanedText,
  );
}

function meaningfulTerms(value: string) {
  return value
    .split(/[，。；、：:（）()“”‘’\s/]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .slice(0, 16);
}

function sharedTrigramCount(candidate: string, text: string) {
  const candidateText = normalizeMentionText(candidate);
  const sourceText = normalizeMentionText(text);

  if (candidateText.length < 3 || sourceText.length < 3) {
    return 0;
  }

  const matched = new Set<string>();

  for (let index = 0; index <= candidateText.length - 3; index += 1) {
    const trigram = candidateText.slice(index, index + 3);

    if (sourceText.includes(trigram)) {
      matched.add(trigram);
    }
  }

  return matched.size;
}

function normalizeMentionText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, "");
}

function statusRank(status: string) {
  return status === "needs_attention" ? 0 : status === "advancing" ? 1 : 2;
}

function expectedChapterRank(
  expectedChapter: number | null | undefined,
  currentChapter: number,
) {
  if (expectedChapter == null) {
    return currentChapter + 1000;
  }

  return expectedChapter <= currentChapter
    ? expectedChapter - currentChapter
    : expectedChapter;
}

function importanceRank(importance: string) {
  return importance === "high" ? 0 : importance === "medium" ? 1 : 2;
}

function normalizeAction(value: unknown): ForeshadowRecoveryAuditAction | null {
  const cleaned = stringValue(value).toLowerCase();

  if (["resolve", "resolved", "回收", "已回收"].includes(cleaned)) {
    return "resolve";
  }

  if (["advance", "advancing", "update", "推进", "已推进"].includes(cleaned)) {
    return "advance";
  }

  return null;
}

function normalizeConfidence(value: unknown): ForeshadowRecoveryAuditConfidence {
  const cleaned = stringValue(value).toLowerCase();

  if (cleaned === "high" || cleaned === "高") {
    return "high";
  }

  if (cleaned === "low" || cleaned === "低") {
    return "low";
  }

  return "medium";
}

function confidenceRank(value: ForeshadowRecoveryAuditConfidence) {
  return value === "high" ? 0 : value === "medium" ? 1 : 2;
}

function recoverySignalRank(signal: ForeshadowRecoverySignal) {
  return confidenceRank(signal.confidence) * 2 + (signal.action === "advance" ? 0 : 1);
}

function parseJsonObject(value?: string | null) {
  const text = value?.trim();

  if (!text) {
    return null;
  }

  const candidates = [
    text,
    text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
  ];
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      // Try the next bounded JSON candidate.
    }
  }

  return null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
