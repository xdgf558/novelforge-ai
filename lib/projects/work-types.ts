export const projectWorkTypeValues = [
  "serial_novel",
  "short_story",
] as const;

export type ProjectWorkType = (typeof projectWorkTypeValues)[number];

export type ProjectToolPath =
  | ""
  | "blueprint"
  | "settings"
  | "characters"
  | "outlines"
  | "storylines"
  | "chapters"
  | "story-review"
  | "audiobook"
  | "memory"
  | "ai";

export const defaultProjectWorkType: ProjectWorkType = "serial_novel";

export const projectWorkTypeOptions = [
  {
    value: "serial_novel",
    label: "长篇连载",
    description: "按卷、剧情单元和章节持续推进。",
  },
  {
    value: "short_story",
    label: "短故事",
    description: "以单篇闭环为目标，内部分单元完成创作。",
  },
] as const satisfies ReadonlyArray<{
  value: ProjectWorkType;
  label: string;
  description: string;
}>;

export function normalizeProjectWorkType(
  value?: string | null,
): ProjectWorkType {
  return value === "short_story" ? "short_story" : defaultProjectWorkType;
}

export function projectWorkTypeLabel(value?: string | null) {
  const normalized = normalizeProjectWorkType(value);

  return (
    projectWorkTypeOptions.find((option) => option.value === normalized)?.label ??
    "长篇连载"
  );
}

export function isShortStoryProject(value?: string | null) {
  return normalizeProjectWorkType(value) === "short_story";
}

const serialNovelToolPaths: readonly ProjectToolPath[] = [
  "settings",
  "characters",
  "outlines",
  "storylines",
  "chapters",
  "audiobook",
  "memory",
  "ai",
];

const shortStoryToolPaths: readonly ProjectToolPath[] = [
  "",
  "blueprint",
  "settings",
  "characters",
  "chapters",
  "story-review",
  "memory",
  "ai",
];

export function projectToolPathsForWorkType(
  value?: string | null,
): readonly ProjectToolPath[] {
  return isShortStoryProject(value)
    ? shortStoryToolPaths
    : serialNovelToolPaths;
}
