import type { ChapterValues } from "./chapter-fields";
import type { OutlineLike } from "./outline-fields";

export type ChapterOutlinePrefill = Partial<
  Pick<ChapterValues, "title" | "goal">
> & {
  sourceOutlineTitle?: string;
};

const outlineStatusPriority = new Map<string, number>([
  ["active", 0],
  ["planned", 1],
  ["completed", 2],
]);

const chapterGoalSections: readonly {
  field: keyof OutlineLike;
  label: string;
}[] = [
  { field: "goal", label: "章节目标" },
  { field: "chapterConflict", label: "章节冲突" },
  { field: "chapterPleasurePoint", label: "章节爽点" },
  { field: "foreshadow", label: "埋设伏笔" },
  { field: "resolvedForeshadow", label: "回收伏笔" },
  { field: "characters", label: "出场角色" },
  { field: "location", label: "地点" },
  { field: "endingHook", label: "章末钩子" },
  { field: "content", label: "补充备注" },
];

export function selectChapterOutlineForPrefill(
  outlines: readonly OutlineLike[],
) {
  return (
    outlines
      .filter(
        (outline) =>
          outline.level === "chapter" &&
          outline.status !== "archived" &&
          typeof outline.chapterNumber === "number",
      )
      .sort(compareChapterOutlinePrefillSource)[0] ?? null
  );
}

export function buildChapterOutlinePrefill(
  outline?: OutlineLike | null,
): ChapterOutlinePrefill | null {
  if (!outline || outline.level !== "chapter" || outline.status === "archived") {
    return null;
  }

  const title = normalizeChapterOutlineTitle(outline.title);
  const goal = buildChapterGoalFromOutline(outline);

  if (!title && !goal) {
    return null;
  }

  return {
    ...(title ? { title } : {}),
    ...(goal ? { goal } : {}),
    sourceOutlineTitle: title || cleanText(outline.title),
  };
}

function compareChapterOutlinePrefillSource(
  left: OutlineLike,
  right: OutlineLike,
) {
  const statusRank =
    statusPriority(left.status) - statusPriority(right.status);

  if (statusRank !== 0) {
    return statusRank;
  }

  const updatedRank = dateTime(right.updatedAt) - dateTime(left.updatedAt);

  if (updatedRank !== 0) {
    return updatedRank;
  }

  return dateTime(right.createdAt) - dateTime(left.createdAt);
}

function buildChapterGoalFromOutline(outline: OutlineLike) {
  const sections = chapterGoalSections
    .map(({ field, label }) => {
      const value = cleanText(outline[field]);

      if (!value) {
        return null;
      }

      return field === "goal" ? value : `${label}：${value}`;
    })
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(sections)).join("\n");
}

function normalizeChapterOutlineTitle(title?: string | null) {
  const cleaned = cleanText(title);

  if (!cleaned) {
    return "";
  }

  const bracketMatch = cleaned.match(/^第\s*\d+\s*章\s*[《「“"](.+?)[》」”"]$/);

  if (bracketMatch?.[1]) {
    return bracketMatch[1].trim();
  }

  const colonMatch = cleaned.match(/^第\s*\d+\s*章\s*[:：]\s*(.+)$/);

  if (colonMatch?.[1]) {
    return colonMatch[1].trim();
  }

  return cleaned;
}

function statusPriority(status?: string | null) {
  return outlineStatusPriority.get(status ?? "") ?? 3;
}

function dateTime(date?: Date | string | null) {
  if (!date) {
    return 0;
  }

  const timestamp = date instanceof Date ? date.getTime() : Date.parse(date);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
