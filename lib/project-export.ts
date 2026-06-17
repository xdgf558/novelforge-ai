type Scalar = string | number | boolean | Date | null | undefined;

export type ProjectExportData = {
  project: Record<string, Scalar>;
  setting?: Record<string, Scalar> | null;
  characters?: readonly Record<string, Scalar>[];
  chapters?: readonly Record<string, Scalar>[];
  worldRules?: readonly Record<string, Scalar>[];
  foreshadows?: readonly Record<string, Scalar>[];
  timelineEvents?: readonly Record<string, Scalar>[];
  pendingUpdates?: readonly Record<string, Scalar>[];
  continuityReports?: readonly Record<string, Scalar>[];
  publishPackages?: readonly Record<string, Scalar>[];
  aiTasks?: readonly Record<string, Scalar>[];
};

export function buildProjectJsonExport(data: ProjectExportData) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      format: "novelforge-ai-project-export",
      version: 1,
      ...data,
    },
    null,
    2,
  );
}

export function buildProjectMarkdownExport(data: ProjectExportData) {
  const projectTitle = formatScalar(data.project.title) || "未命名项目";
  const sections = [
    `# ${projectTitle}`,
    buildKeyValueList([
      ["题材", data.project.genre],
      ["目标读者", data.project.targetAudience],
      ["连载平台", data.project.platform],
      ["状态", data.project.status],
      ["公众号定位", data.project.wechatPositioning],
      ["故事简介", data.project.description],
    ]),
    buildSettingSection(data.setting),
    buildRecordSection("角色库", data.characters, (character) => [
      `### ${formatScalar(character.name) || "未命名角色"}`,
      buildKeyValueList([
        ["故事角色", character.roleInStory],
        ["身份", character.identity],
        ["状态", character.status],
        ["说话风格", character.speakingStyle],
        ["行为规则", character.behaviorRules],
        ["最近出场", character.latestAppearance],
        ["备注", character.notes],
      ]),
    ]),
    buildRecordSection("章节", data.chapters, (chapter) => [
      `### 第 ${formatScalar(chapter.chapterNumber) || "?"} 章 ${formatScalar(
        chapter.title,
      )}`,
      buildKeyValueList([
        ["状态", chapter.status],
        ["字数", chapter.wordCount],
        ["目标", chapter.goal],
        ["节拍", chapter.beats],
        ["草稿", chapter.draftText],
        ["定稿", chapter.finalText],
        ["备注", chapter.notes],
      ]),
    ]),
    buildRecordSection("世界规则", data.worldRules, (rule) => [
      `### ${formatScalar(rule.title) || "未命名规则"}`,
      buildKeyValueList([
        ["分类", rule.category],
        ["风险", rule.riskLevel],
        ["状态", rule.status],
        ["内容", rule.content],
      ]),
    ]),
    buildRecordSection("伏笔", data.foreshadows, (foreshadow) => [
      `### ${formatScalar(foreshadow.content) || "未命名伏笔"}`,
      buildKeyValueList([
        ["状态", foreshadow.status],
        ["重要度", foreshadow.importance],
        ["埋设章节", foreshadow.plantedChapterId],
        ["回收章节", foreshadow.resolvedChapterId],
      ]),
    ]),
    buildRecordSection("时间线", data.timelineEvents, (event) => [
      `### ${formatScalar(event.title) || "未命名事件"}`,
      buildKeyValueList([
        ["故事时间", event.storyTime],
        ["章节", event.chapterId],
        ["影响", event.impact],
        ["描述", event.description],
      ]),
    ]),
    buildRecordSection("待审更新", data.pendingUpdates, (update) => [
      `### ${formatScalar(update.title) || "未命名更新"}`,
      buildKeyValueList([
        ["状态", update.status],
        ["目标类型", update.targetType],
        ["风险", update.riskLevel],
        ["建议内容", update.proposedContent],
        ["证据", update.evidence],
      ]),
    ]),
    buildRecordSection("连续性报告", data.continuityReports, (report) => [
      `### ${formatScalar(report.title) || "未命名报告"}`,
      buildKeyValueList([
        ["状态", report.status],
        ["严重度", report.severity],
        ["分类", report.category],
        ["描述", report.description],
        ["证据", report.evidence],
        ["修复建议", report.suggestedFix],
      ]),
    ]),
    buildRecordSection("公众号发布包装", data.publishPackages, (item) => [
      `### ${formatScalar(item.selectedTitle) || "未选择标题"}`,
      buildKeyValueList([
        ["状态", item.status],
        ["章节", item.chapterId],
        ["开头引导", item.openingGuide],
        ["互动问题", item.endingQuestion],
        ["下章预告", item.nextChapterPreview],
        ["评论引导", item.commentGuide],
      ]),
    ]),
    buildRecordSection("AI 任务记录", data.aiTasks, (task) => [
      `### ${formatScalar(task.taskType) || "未知任务"}`,
      buildKeyValueList([
        ["状态", task.status],
        ["采用状态", task.adoptionState],
        ["模型", task.model],
        ["上下文", task.inputContextSummary],
        ["创建时间", task.createdAt],
      ]),
    ]),
  ];

  return sections.filter(Boolean).join("\n\n").trim();
}

function buildSettingSection(setting?: Record<string, Scalar> | null) {
  if (!setting) {
    return "## 项目设定\n\n暂无项目设定。";
  }

  const entries = Object.entries(setting).filter(
    ([key, value]) =>
      !["id", "projectId", "createdAt", "updatedAt"].includes(key) &&
      Boolean(formatScalar(value)),
  );

  if (entries.length === 0) {
    return "## 项目设定\n\n暂无项目设定。";
  }

  return ["## 项目设定", buildKeyValueList(entries)].join("\n\n");
}

function buildRecordSection(
  title: string,
  records: readonly Record<string, Scalar>[] | undefined,
  renderRecord: (record: Record<string, Scalar>) => string[],
) {
  if (!records || records.length === 0) {
    return `## ${title}\n\n暂无记录。`;
  }

  return [
    `## ${title}`,
    ...records.map((record) => renderRecord(record).filter(Boolean).join("\n\n")),
  ].join("\n\n");
}

function buildKeyValueList(items: readonly (readonly [string, Scalar])[]) {
  const lines = items
    .map(([label, value]) => [label, formatScalar(value)] as const)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `- ${label}: ${value}`);

  return lines.length > 0 ? lines.join("\n") : "暂无内容。";
}

function formatScalar(value: Scalar) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}
