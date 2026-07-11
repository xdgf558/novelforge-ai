type CharacterPriorityRecord = {
  name: string;
  roleInStory?: string | null;
  updatedAt?: Date | string | null;
};

type WorldRulePriorityRecord = {
  title: string;
  content?: string | null;
  riskLevel?: string | null;
  isCore?: boolean | null;
  updatedAt?: Date | string | null;
};

type ForeshadowPriorityRecord = {
  content: string;
  status?: string | null;
  importance?: string | null;
  expectedResolveChapter?: number | null;
  updatedAt?: Date | string | null;
};

type TimelinePriorityRecord = {
  title: string;
  description?: string | null;
  relatedCharacters?: string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

const coreCharacterPattern = /主角|主人公|核心人物|核心角色|protagonist/i;

export function selectRelevantCharacters<T extends CharacterPriorityRecord>(
  characters: readonly T[],
  relevanceText: string,
  limit: number,
) {
  return selectLimited(characters, limit, (left, right) => {
    return (
      mentionRank(left.name, relevanceText) -
        mentionRank(right.name, relevanceText) ||
      coreCharacterRank(left.roleInStory) -
        coreCharacterRank(right.roleInStory) ||
      compareRecent(left.updatedAt, right.updatedAt) ||
      left.name.localeCompare(right.name, "zh-CN")
    );
  });
}

export function selectRelevantWorldRules<T extends WorldRulePriorityRecord>(
  rules: readonly T[],
  relevanceText: string,
  limit: number,
) {
  return selectLimited(rules, limit, (left, right) => {
    return (
      booleanRank(left.isCore) - booleanRank(right.isCore) ||
      riskRank(left.riskLevel) - riskRank(right.riskLevel) ||
      mentionRank(left.title, relevanceText) -
        mentionRank(right.title, relevanceText) ||
      compareRecent(left.updatedAt, right.updatedAt) ||
      left.title.localeCompare(right.title, "zh-CN")
    );
  });
}

export function selectRelevantForeshadows<T extends ForeshadowPriorityRecord>(
  foreshadows: readonly T[],
  relevanceText: string,
  currentChapterNumber: number,
  limit: number,
) {
  return selectLimited(foreshadows, limit, (left, right) => {
    return (
      foreshadowStatusRank(left.status) -
        foreshadowStatusRank(right.status) ||
      expectedChapterRank(left.expectedResolveChapter, currentChapterNumber) -
        expectedChapterRank(right.expectedResolveChapter, currentChapterNumber) ||
      importanceRank(left.importance) - importanceRank(right.importance) ||
      mentionRank(left.content, relevanceText) -
        mentionRank(right.content, relevanceText) ||
      compareRecent(left.updatedAt, right.updatedAt) ||
      left.content.localeCompare(right.content, "zh-CN")
    );
  });
}

export function selectRelevantTimelineEvents<T extends TimelinePriorityRecord>(
  events: readonly T[],
  relevanceText: string,
  limit: number,
) {
  return selectLimited(events, limit, (left, right) => {
    const leftText = [left.title, left.description, left.relatedCharacters]
      .filter(Boolean)
      .join("\n");
    const rightText = [right.title, right.description, right.relatedCharacters]
      .filter(Boolean)
      .join("\n");

    return (
      mentionRank(leftText, relevanceText) -
        mentionRank(rightText, relevanceText) ||
      compareRecent(
        left.updatedAt ?? left.createdAt,
        right.updatedAt ?? right.createdAt,
      ) ||
      left.title.localeCompare(right.title, "zh-CN")
    );
  });
}

function selectLimited<T>(
  records: readonly T[],
  limit: number,
  compare: (left: T, right: T) => number,
) {
  return [...records].sort(compare).slice(0, Math.max(0, limit));
}

function mentionRank(candidate: string | null | undefined, relevanceText: string) {
  const cleanedCandidate = candidate?.trim();
  const cleanedText = relevanceText.trim();

  if (!cleanedCandidate || !cleanedText) {
    return 1;
  }

  if (cleanedText.includes(cleanedCandidate)) {
    return 0;
  }

  const meaningfulTerms = cleanedCandidate
    .split(/[，。；、：:（）()\s/]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  return meaningfulTerms.some((term) => cleanedText.includes(term)) ? 0 : 1;
}

function coreCharacterRank(roleInStory?: string | null) {
  return coreCharacterPattern.test(roleInStory?.trim() ?? "") ? 0 : 1;
}

function booleanRank(value?: boolean | null) {
  return value ? 0 : 1;
}

function riskRank(value?: string | null) {
  return value === "high" ? 0 : value === "medium" ? 1 : value === "low" ? 2 : 3;
}

function importanceRank(value?: string | null) {
  return value === "high" ? 0 : value === "medium" ? 1 : value === "low" ? 2 : 3;
}

function foreshadowStatusRank(value?: string | null) {
  switch (value) {
    case "needs_attention":
      return 0;
    case "advancing":
      return 1;
    case "planted":
      return 2;
    case "resolved":
      return 3;
    case "abandoned":
      return 4;
    default:
      return 5;
  }
}

function expectedChapterRank(
  expectedResolveChapter: number | null | undefined,
  currentChapterNumber: number,
) {
  if (expectedResolveChapter == null) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (expectedResolveChapter <= currentChapterNumber) {
    return expectedResolveChapter - currentChapterNumber;
  }

  return expectedResolveChapter;
}

function compareRecent(
  left?: Date | string | null,
  right?: Date | string | null,
) {
  return dateValue(right) - dateValue(left);
}

function dateValue(value?: Date | string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : 0;
}
