export const publishPackageStatusOptions = [
  { value: "draft", label: "草稿" },
  { value: "exported", label: "已导出" },
] as const;

export function publishPackageStatusLabel(status?: string | null) {
  return (
    publishPackageStatusOptions.find((option) => option.value === status)?.label ??
    "未知"
  );
}

export function parseStoredStringList(value?: string | null): string[] {
  const cleaned = clean(value);

  if (!cleaned) {
    return [];
  }

  try {
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => clean(String(item))).filter(Boolean);
  } catch {
    return cleaned
      .split(/\r?\n/)
      .map(clean)
      .filter(Boolean);
  }
}

export type PublishMarkdownInput = {
  selectedTitle?: string | null;
  openingGuide?: string | null;
  chapterSummary?: string | null;
  finalText?: string | null;
  endingQuestion?: string | null;
  nextChapterPreview?: string | null;
  commentGuide?: string | null;
};

export function buildPublishMarkdown(input: PublishMarkdownInput) {
  const sections = [
    clean(input.selectedTitle) ? `# ${clean(input.selectedTitle)}` : "",
    clean(input.openingGuide),
    clean(input.chapterSummary) ? `> ${clean(input.chapterSummary)}` : "",
    clean(input.finalText),
    clean(input.endingQuestion)
      ? `---\n\n**互动问题**：${clean(input.endingQuestion)}`
      : "",
    clean(input.nextChapterPreview)
      ? `**下章预告**：${clean(input.nextChapterPreview)}`
      : "",
    clean(input.commentGuide) ? `**评论区引导**：${clean(input.commentGuide)}` : "",
  ];

  return sections.filter(Boolean).join("\n\n").trim();
}

function clean(value?: string | null) {
  return value?.trim().replace(/\n{3,}/g, "\n\n") ?? "";
}
