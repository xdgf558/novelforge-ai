export type MvpAcceptanceAiTask = {
  taskType: string;
  status: string;
};

export type MvpAcceptanceChapter = {
  chapterNumber: number;
  beats?: string | null;
  draftText?: string | null;
  finalText?: string | null;
};

export type MvpAcceptancePendingUpdate = {
  status: string;
};

export type MvpAcceptanceProjectSnapshot = {
  project?: {
    id?: string | null;
    title?: string | null;
    createdAt?: Date | string | null;
  } | null;
  setting?: Record<string, unknown> | null;
  characters: readonly unknown[];
  chapters: readonly MvpAcceptanceChapter[];
  aiTasks: readonly MvpAcceptanceAiTask[];
  pendingUpdates: readonly MvpAcceptancePendingUpdate[];
  continuityReports: readonly unknown[];
  publishPackages: readonly unknown[];
  exportFormats?: {
    markdown?: boolean;
    json?: boolean;
  };
  persistedAfterReconnect?: boolean;
};

export type MvpAcceptanceCheck = {
  id: string;
  category: "project" | "story" | "ai" | "review" | "release" | "persistence";
  label: string;
  description: string;
  passed: boolean;
  evidence: string;
  actionHint: string;
};

export type MvpAcceptanceReport = {
  checks: MvpAcceptanceCheck[];
  passedCount: number;
  totalCount: number;
  completionPercent: number;
  isComplete: boolean;
};

const requiredLoggedTaskTypes = [
  "project_setting_generation",
  "chapter_beat_generation",
  "chapter_draft_generation",
  "chapter_summary_extraction",
  "pending_update_extraction",
  "continuity_check",
  "wechat_publish_packaging",
] as const;

export function buildMvpAcceptanceReport(
  snapshot: MvpAcceptanceProjectSnapshot,
): MvpAcceptanceReport {
  const completedTaskTypes = new Set(
    snapshot.aiTasks
      .filter((task) => task.status === "completed")
      .map((task) => task.taskType),
  );
  const chapterOne = snapshot.chapters.find(
    (chapter) => chapter.chapterNumber === 1,
  );
  const chapterOneHasBeats = Boolean(chapterOne?.beats?.trim());
  const missingLoggedTaskTypes = requiredLoggedTaskTypes.filter(
    (taskType) => !snapshot.aiTasks.some((task) => task.taskType === taskType),
  );
  const checks: MvpAcceptanceCheck[] = [
    check({
      id: "project_created",
      category: "project",
      label: "可以创建小说项目",
      description: "项目记录已存在，并可从本地数据库读取。",
      passed: Boolean(snapshot.project?.id),
      evidence: snapshot.project?.title
        ? `当前项目：${snapshot.project.title}`
        : "未读取到项目记录。",
      actionHint: "先创建一个小说项目。",
    }),
    check({
      id: "setting_saved",
      category: "story",
      label: "可以填写并保存总设定档",
      description: "项目设定记录存在，并至少有一个设定字段已填写。",
      passed: hasAnySettingValue(snapshot.setting),
      evidence: hasAnySettingValue(snapshot.setting)
        ? "已读取到非空项目设定字段。"
        : "项目设定为空或尚未保存。",
      actionHint: "进入总设定档，保存至少一个设定字段。",
    }),
    check({
      id: "setting_ai_generated",
      category: "ai",
      label: "可以通过 AI 生成总设定档",
      description: "存在完成状态的项目设定生成 AI 任务。",
      passed: completedTaskTypes.has("project_setting_generation"),
      evidence: taskEvidence(snapshot.aiTasks, "project_setting_generation"),
      actionHint: "在 AI 工作台或设定页生成总设定草案。",
    }),
    check({
      id: "five_characters",
      category: "story",
      label: "可以创建至少 5 个角色",
      description: "角色库至少包含 5 条角色记录。",
      passed: snapshot.characters.length >= 5,
      evidence: `当前角色数：${snapshot.characters.length}`,
      actionHint: "进入角色库，补足至少 5 个角色。",
    }),
    check({
      id: "chapter_one_created",
      category: "story",
      label: "可以创建第 1 章",
      description: "章节列表中存在章节编号为 1 的章节。",
      passed: Boolean(chapterOne),
      evidence: chapterOne ? "已找到第 1 章。" : "尚未找到第 1 章。",
      actionHint: "创建章节编号为 1 的章节。",
    }),
    check({
      id: "beats_generated",
      category: "ai",
      label: "可以根据设定和人物生成章节节拍",
      description: "存在章节节拍生成任务，或第 1 章已保存节拍。",
      passed:
        completedTaskTypes.has("chapter_beat_generation") ||
        chapterOneHasBeats,
      evidence: completedTaskTypes.has("chapter_beat_generation")
        ? taskEvidence(snapshot.aiTasks, "chapter_beat_generation")
        : chapterOneHasBeats
          ? "第 1 章已有节拍文本。"
          : taskEvidence(snapshot.aiTasks, "chapter_beat_generation"),
      actionHint: "在章节详情页生成节拍，必要时采用到章节节拍。",
    }),
    check({
      id: "draft_generated",
      category: "ai",
      label: "可以根据章节节拍生成正文草稿",
      description: "存在完成状态的章节草稿生成 AI 任务。",
      passed: completedTaskTypes.has("chapter_draft_generation"),
      evidence: taskEvidence(snapshot.aiTasks, "chapter_draft_generation"),
      actionHint: "在章节详情页确认节拍后生成草稿。",
    }),
    check({
      id: "draft_saved",
      category: "story",
      label: "可以保存正文草稿",
      description: "至少一个章节保存了草稿正文。",
      passed: snapshot.chapters.some((chapter) => Boolean(chapter.draftText?.trim())),
      evidence: snapshot.chapters.some((chapter) => Boolean(chapter.draftText?.trim()))
        ? "已找到带草稿正文的章节。"
        : "尚未找到草稿正文。",
      actionHint: "编辑章节并保存草稿正文，或采用 AI 草稿。",
    }),
    check({
      id: "summary_extracted",
      category: "ai",
      label: "可以从正文中提取章节摘要",
      description: "存在完成状态的章节摘要提取 AI 任务。",
      passed: completedTaskTypes.has("chapter_summary_extraction"),
      evidence: taskEvidence(snapshot.aiTasks, "chapter_summary_extraction"),
      actionHint: "保存定稿正文后运行章节摘要提取。",
    }),
    check({
      id: "updates_extracted",
      category: "ai",
      label: "可以从正文中提取设定更新建议",
      description: "存在完成状态的待审更新提取 AI 任务。",
      passed: completedTaskTypes.has("pending_update_extraction"),
      evidence: taskEvidence(snapshot.aiTasks, "pending_update_extraction"),
      actionHint: "保存定稿正文和摘要后运行待审更新提取。",
    }),
    check({
      id: "pending_update_listed",
      category: "review",
      label: "设定更新建议进入待确认列表",
      description: "待审更新列表中至少存在一条记录。",
      passed: snapshot.pendingUpdates.length > 0,
      evidence: `当前待审/已审更新数：${snapshot.pendingUpdates.length}`,
      actionHint: "运行待审更新提取，让建议进入待确认列表。",
    }),
    check({
      id: "update_approved",
      category: "review",
      label: "批准后能写入正式记忆",
      description: "至少一条待审更新处于已批准/已应用状态。",
      passed: snapshot.pendingUpdates.some(isApprovedPendingUpdate),
      evidence: approvedStatusEvidence(snapshot.pendingUpdates),
      actionHint: "在待审更新页批准一条建议。",
    }),
    check({
      id: "update_rejected",
      category: "review",
      label: "拒绝后不会影响正式设定",
      description: "至少一条待审更新处于已拒绝状态。",
      passed: snapshot.pendingUpdates.some((update) => update.status === "rejected"),
      evidence: statusCountEvidence(snapshot.pendingUpdates, "rejected", "已拒绝"),
      actionHint: "在待审更新页拒绝一条建议。",
    }),
    check({
      id: "continuity_reported",
      category: "ai",
      label: "连续性检查能输出问题列表",
      description: "存在连续性报告记录，或连续性检查 AI 任务已完成。",
      passed:
        snapshot.continuityReports.length > 0 ||
        completedTaskTypes.has("continuity_check"),
      evidence:
        snapshot.continuityReports.length > 0
          ? `连续性报告数：${snapshot.continuityReports.length}`
          : taskEvidence(snapshot.aiTasks, "continuity_check"),
      actionHint: "在章节详情页运行连续性检查。",
    }),
    check({
      id: "ai_calls_logged",
      category: "ai",
      label: "所有核心 AI 调用都有记录",
      description: "核心 AI 任务类型都能在 ai_tasks 中找到审计记录。",
      passed: missingLoggedTaskTypes.length === 0,
      evidence:
        missingLoggedTaskTypes.length === 0
          ? "核心 AI 任务类型均已有记录。"
          : `缺少记录：${missingLoggedTaskTypes.join(", ")}`,
      actionHint: "按缺失任务类型运行对应 AI 功能。",
    }),
    check({
      id: "persistence_ready",
      category: "persistence",
      label: "关闭后数据仍然存在",
      description: "项目数据能从 SQLite 重新读取；脚本验收会重新连接数据库验证。",
      passed:
        snapshot.persistedAfterReconnect ??
        Boolean(snapshot.project?.id && snapshot.chapters.length > 0),
      evidence: snapshot.persistedAfterReconnect
        ? "已通过重新连接数据库验证。"
        : "当前页面数据来自 SQLite 持久化读取。",
      actionHint: "运行 npm run mvp:acceptance 做重新连接验证。",
    }),
    check({
      id: "publish_package_created",
      category: "release",
      label: "可以生成公众号发布包装",
      description: "至少存在一个章节发布包装记录。",
      passed: snapshot.publishPackages.length > 0,
      evidence: `当前发布包装数：${snapshot.publishPackages.length}`,
      actionHint: "保存定稿正文后生成公众号发布包装。",
    }),
    check({
      id: "export_ready",
      category: "release",
      label: "项目可以导出 Markdown 或 JSON",
      description: "当前项目可构建 Markdown 或 JSON 导出内容。",
      passed: Boolean(snapshot.exportFormats?.markdown || snapshot.exportFormats?.json),
      evidence:
        snapshot.exportFormats?.markdown && snapshot.exportFormats?.json
          ? "Markdown 与 JSON 导出均可生成。"
          : "尚未验证导出内容生成。",
      actionHint: "进入发布与导出页，检查项目 Markdown/JSON 导出。",
    }),
  ];
  const passedCount = checks.filter((item) => item.passed).length;
  const totalCount = checks.length;

  return {
    checks,
    passedCount,
    totalCount,
    completionPercent: Math.round((passedCount / totalCount) * 100),
    isComplete: passedCount === totalCount,
  };
}

function check(input: MvpAcceptanceCheck): MvpAcceptanceCheck {
  return input;
}

function hasAnySettingValue(setting?: Record<string, unknown> | null) {
  if (!setting) {
    return false;
  }

  return Object.entries(setting).some(([key, value]) => {
    if (["id", "projectId", "createdAt", "updatedAt"].includes(key)) {
      return false;
    }

    return typeof value === "string" ? value.trim().length > 0 : value != null;
  });
}

function taskEvidence(tasks: readonly MvpAcceptanceAiTask[], taskType: string) {
  const total = tasks.filter((task) => task.taskType === taskType).length;
  const completed = tasks.filter(
    (task) => task.taskType === taskType && task.status === "completed",
  ).length;

  if (total === 0) {
    return `未找到 ${taskType} 任务记录。`;
  }

  return `${taskType}：${completed}/${total} 已完成。`;
}

function statusCountEvidence(
  updates: readonly MvpAcceptancePendingUpdate[],
  status: string,
  label: string,
) {
  const count = updates.filter((update) => update.status === status).length;
  return `${label}更新数：${count}`;
}

function approvedStatusEvidence(
  updates: readonly MvpAcceptancePendingUpdate[],
) {
  const count = updates.filter(isApprovedPendingUpdate).length;

  return `已批准/已应用更新数：${count}`;
}

function isApprovedPendingUpdate(update: MvpAcceptancePendingUpdate) {
  return update.status === "approved" || update.status === "applied";
}
