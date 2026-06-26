export type ReaderFeedbackSignal = {
  chapterNumber: number;
  title: string;
  fetchedAt?: Date | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  favorites?: number | null;
  shares?: number | null;
  completionRate?: number | null;
  averageReadSeconds?: number | null;
  dropOffPoint?: string | null;
  engagementScore?: number | null;
  summary?: string | null;
  pacing?: string | null;
  focus?: string | null;
  hookStrategy?: string | null;
  riskNotes?: string | null;
  characterPriority?: string | null;
};

export type ReaderFeedbackChapterRecord = {
  chapterNumber: number;
  title: string;
  readerAnalytics?: readonly {
    fetchedAt: Date;
    views: number | null;
    likes: number | null;
    comments: number | null;
    favorites: number | null;
    shares: number | null;
    completionRate: number | null;
    averageReadSeconds: number | null;
    dropOffPoint: string | null;
    engagementScore: number | null;
  }[];
  readerInsights?: readonly {
    fetchedAt: Date;
    summary: string | null;
    pacing: string | null;
    focus: string | null;
    hookStrategy: string | null;
    riskNotesJson: string | null;
    characterPriorityJson: string | null;
  }[];
};

const TEXT_FIELD_LIMIT = 360;

export function buildReaderFeedbackSignals(
  chapters: readonly ReaderFeedbackChapterRecord[],
): ReaderFeedbackSignal[] {
  const signals: ReaderFeedbackSignal[] = [];

  for (const chapter of chapters) {
    const analytics = chapter.readerAnalytics?.[0] ?? null;
    const insight = chapter.readerInsights?.[0] ?? null;

    if (!analytics && !insight) {
      continue;
    }

    signals.push({
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      fetchedAt: latestDate(analytics?.fetchedAt, insight?.fetchedAt),
      views: analytics?.views ?? null,
      likes: analytics?.likes ?? null,
      comments: analytics?.comments ?? null,
      favorites: analytics?.favorites ?? null,
      shares: analytics?.shares ?? null,
      completionRate: analytics?.completionRate ?? null,
      averageReadSeconds: analytics?.averageReadSeconds ?? null,
      dropOffPoint: clipText(analytics?.dropOffPoint),
      engagementScore: analytics?.engagementScore ?? null,
      summary: clipText(insight?.summary),
      pacing: clipText(insight?.pacing),
      focus: clipText(insight?.focus),
      hookStrategy: clipText(insight?.hookStrategy),
      riskNotes: clipText(jsonPreview(insight?.riskNotesJson)),
      characterPriority: clipText(jsonPreview(insight?.characterPriorityJson)),
    });
  }

  return signals;
}

export function readerFeedbackSignalsToJson(
  signals: readonly ReaderFeedbackSignal[],
) {
  return signals.map((signal) => ({
    chapterNumber: signal.chapterNumber,
    title: signal.title,
    fetchedAt: signal.fetchedAt?.toISOString() ?? null,
    metrics: {
      views: signal.views ?? null,
      completionRate: signal.completionRate ?? null,
      engagementScore: signal.engagementScore ?? null,
      averageReadSeconds: signal.averageReadSeconds ?? null,
      likes: signal.likes ?? null,
      comments: signal.comments ?? null,
      favorites: signal.favorites ?? null,
      shares: signal.shares ?? null,
    },
    dropOffPoint: signal.dropOffPoint ?? null,
    insight: {
      summary: signal.summary ?? null,
      pacing: signal.pacing ?? null,
      focus: signal.focus ?? null,
      hookStrategy: signal.hookStrategy ?? null,
      riskNotes: signal.riskNotes ?? null,
      characterPriority: signal.characterPriority ?? null,
    },
  }));
}

export function formatReaderFeedbackSignals(
  signals: readonly ReaderFeedbackSignal[],
) {
  if (signals.length === 0) {
    return "暂无可用于当前章生成的读者反馈。";
  }

  return signals.map(formatReaderFeedbackSignal).join("\n");
}

function formatReaderFeedbackSignal(signal: ReaderFeedbackSignal) {
  const metrics = compact([
    signal.views != null ? `阅读量 ${formatNumber(signal.views)}` : "",
    signal.completionRate != null ? `完成率 ${formatRate(signal.completionRate)}` : "",
    signal.engagementScore != null ? `互动分 ${formatNumber(signal.engagementScore)}` : "",
    signal.averageReadSeconds != null
      ? `均读时长 ${formatSeconds(signal.averageReadSeconds)}`
      : "",
    signal.likes != null ? `点赞 ${formatNumber(signal.likes)}` : "",
    signal.comments != null ? `评论 ${formatNumber(signal.comments)}` : "",
  ]).join("；");
  const details = compact([
    metrics,
    signal.dropOffPoint ? `主要流失点：${signal.dropOffPoint}` : "",
    signal.summary ? `洞察摘要：${signal.summary}` : "",
    signal.pacing ? `节奏反馈：${signal.pacing}` : "",
    signal.focus ? `读者关注：${signal.focus}` : "",
    signal.hookStrategy ? `追更钩子建议：${signal.hookStrategy}` : "",
    signal.riskNotes ? `风险提示：${signal.riskNotes}` : "",
    signal.characterPriority ? `角色优先级：${signal.characterPriority}` : "",
  ]);

  return `- 第 ${signal.chapterNumber} 章《${signal.title}》${signal.fetchedAt ? `（${signal.fetchedAt.toISOString().slice(0, 10)}）` : ""}：${
    details.join("；") || "有反馈快照，但未返回可摘要字段。"
  }`;
}

function latestDate(...values: Array<Date | null | undefined>) {
  const dates = values.filter((value): value is Date => value instanceof Date);

  if (dates.length === 0) {
    return null;
  }

  return dates.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest,
  );
}

function jsonPreview(value?: string | null) {
  if (!value) {
    return "";
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.map(jsonTextItem).filter(Boolean).join("；");
    }

    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>)
        .map(([key, item]) => `${key}: ${jsonTextItem(item)}`)
        .filter(Boolean)
        .join("；");
    }
  } catch {
    return value;
  }

  return value;
}

function jsonTextItem(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  return JSON.stringify(value);
}

function clipText(value?: string | null, maxLength = TEXT_FIELD_LIMIT) {
  const cleaned = value?.trim().replace(/\n{3,}/g, "\n\n") ?? "";

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength)}...`;
}

function compact(values: readonly string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatRate(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function formatSeconds(value: number) {
  if (value < 60) {
    return `${value}秒`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds ? `${minutes}分${seconds}秒` : `${minutes}分`;
}
