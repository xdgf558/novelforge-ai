type Scalar = string | number | boolean | Date | null | undefined;
type StructuredExportItem = Record<string, Scalar>;
type ExportValue = Scalar | readonly StructuredExportItem[];
type ProjectExportRecord = Record<string, ExportValue>;

export type ProjectExportData = {
  project: ProjectExportRecord;
  setting?: ProjectExportRecord | null;
  characters?: readonly ProjectExportRecord[];
  characterRelationships?: readonly ProjectExportRecord[];
  outlines?: readonly ProjectExportRecord[];
  storylines?: readonly ProjectExportRecord[];
  chapters?: readonly ProjectExportRecord[];
  chapterSummaries?: readonly ProjectExportRecord[];
  worldRules?: readonly ProjectExportRecord[];
  foreshadows?: readonly ProjectExportRecord[];
  timelineEvents?: readonly ProjectExportRecord[];
  pendingUpdates?: readonly ProjectExportRecord[];
  continuityReports?: readonly ProjectExportRecord[];
  publishPackages?: readonly ProjectExportRecord[];
  aiTasks?: readonly ProjectExportRecord[];
  aiUsageDaily?: readonly ProjectExportRecord[];
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
      ["AI 每日 token 提醒", data.project.aiDailyTokenBudget],
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
    buildRecordSection("人物关系网络", data.characterRelationships, (item) => [
      `### ${formatScalar(item.sourceCharacterName) || "未知"} -> ${formatScalar(
        item.targetCharacterName,
      ) || "未知"}`,
      buildKeyValueList([
        ["类型", item.relationshipType],
        ["方向", item.direction],
        ["状态", item.status],
        ["摘要", item.summary],
        ["阶段变化", item.dynamics],
        ["证据", item.evidence],
        ["来源章节", item.sourceChapterId],
      ]),
    ]),
    buildRecordSection("大纲", data.outlines, (outline) => [
      `### ${formatScalar(outline.title) || "未命名大纲"}`,
      buildKeyValueList([
        ["层级", outline.level],
        ["状态", outline.status],
        ["卷号", outline.volumeNumber],
        ["单元号", outline.unitNumber],
        ["章节号", outline.chapterNumber],
        ["起始章节", outline.startChapter],
        ["结束章节", outline.endChapter],
        ["预计章节数", outline.expectedChapters],
        ["预计字数", outline.expectedWords],
        ["目标", outline.goal],
        ["主线推进", outline.mainlineProgression],
        ["核心冲突", outline.mainConflict],
        ["核心事件", outline.coreEvents],
        ["角色变化", outline.characterChanges],
        ["爽点设计", outline.pleasureDesign],
        ["章节冲突", outline.chapterConflict],
        ["章节爽点", outline.chapterPleasurePoint],
        ["埋设伏笔", outline.foreshadow],
        ["回收伏笔", outline.resolvedForeshadow],
        ["章末钩子", outline.endingHook],
        ["补充备注", outline.content],
      ]),
    ]),
    buildRecordSection("多故事线", data.storylines, (storyline) => [
      `### ${formatScalar(storyline.name) || "未命名故事线"}`,
      buildKeyValueList([
        ["类型", storyline.type],
        ["状态", storyline.status],
        ["起始章节", storyline.startChapter],
        ["结束章节", storyline.endChapter],
        ["核心目标", storyline.coreGoal],
        ["当前进展", storyline.currentProgress],
        ["关联人物", storyline.relatedCharacters],
        ["关联伏笔", storyline.relatedForeshadows],
        ["推进章节", storyline.relatedChapters],
        ["关联大纲", storyline.relatedOutlines],
        ["备注", storyline.notes],
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
        ["精修", chapter.polishedText],
        ["定稿", chapter.finalText],
        ["备注", chapter.notes],
      ]),
    ]),
    buildRecordSection("章节摘要", data.chapterSummaries, (summary) => [
      `### ${formatScalar(summary.inputContextSummary) || "章节摘要"}`,
      buildKeyValueList([
        ["章节", summary.chapterId],
        ["模型", summary.model],
        ["来源正文指纹", summary.sourceTextHash],
        ["摘要", summary.outputText],
      ]),
    ]),
    buildRecordSection("世界规则", data.worldRules, (rule) => [
      `### ${formatScalar(rule.title) || "未命名规则"}`,
      buildKeyValueList([
        ["分类", rule.category],
        ["核心规则", rule.isCore ? "是" : ""],
        ["风险", rule.riskLevel],
        ["状态", rule.status],
        ["适用范围", rule.scope],
        ["相关人物", rule.relatedCharacters],
        ["相关地点", rule.relatedLocations],
        ["相关组织", rule.relatedOrganizations],
        ["内容", rule.content],
      ]),
    ]),
    buildRecordSection("伏笔", data.foreshadows, (foreshadow) => [
      `### ${formatScalar(foreshadow.content) || "未命名伏笔"}`,
      buildKeyValueList([
        ["状态", foreshadow.status],
        ["重要度", foreshadow.importance],
        ["预计回收章节", foreshadow.expectedResolveChapter],
        ["相关人物", foreshadow.relatedCharacters],
        ["相关地点", foreshadow.relatedLocations],
        ["相关势力", foreshadow.relatedFactions],
        ["埋设章节", foreshadow.plantedChapterId],
        ["回收章节", foreshadow.resolvedChapterId],
      ]),
    ]),
    buildRecordSection("时间线", data.timelineEvents, (event) => [
      `### ${formatScalar(event.title) || "未命名事件"}`,
      buildKeyValueList([
        ["故事时间", event.storyTime],
        ["状态", event.status],
        ["相关人物", event.relatedCharacters],
        ["地点", event.location],
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
    buildRecordSection("历史发布包装", data.publishPackages, (item) => [
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
    buildRecordSection("AI 用量统计", data.aiUsageDaily, (usage) => [
      `### ${formatScalar(usage.dateKey) || "未知日期"} / ${formatScalar(
        usage.taskType,
      )}`,
      buildKeyValueList([
        ["模型", usage.model],
        ["调用次数", usage.callCount],
        ["输入 token", usage.tokenInput],
        ["输出 token", usage.tokenOutput],
        ["总 token", usage.tokenTotal],
      ]),
    ]),
  ];

  return sections.filter(Boolean).join("\n\n").trim();
}

function buildSettingSection(setting?: ProjectExportRecord | null) {
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
  records: readonly ProjectExportRecord[] | undefined,
  renderRecord: (record: ProjectExportRecord) => string[],
) {
  if (!records || records.length === 0) {
    return `## ${title}\n\n暂无记录。`;
  }

  return [
    `## ${title}`,
    ...records.map((record) => renderRecord(record).filter(Boolean).join("\n\n")),
  ].join("\n\n");
}

function buildKeyValueList(items: readonly (readonly [string, ExportValue])[]) {
  const lines = items
    .map(([label, value]) => [label, formatScalar(value)] as const)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `- ${label}: ${value}`);

  return lines.length > 0 ? lines.join("\n") : "暂无内容。";
}

function formatScalar(value: ExportValue) {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value)) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}
