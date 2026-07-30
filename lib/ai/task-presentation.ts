export const aiTaskTypeLabels = {
  ai_readiness_check: "AI 接入检查",
  chapter_beat_generation: "章节节拍生成",
  chapter_draft_generation: "章节草稿生成",
  chapter_polish_generation: "正文精修",
  chapter_summary_extraction: "章节摘要提取",
  character_generation: "角色草案生成",
  character_relationship_generation: "角色关系草案生成",
  continuity_check: "连续性检查",
  continuity_fix_patch_generation: "连续性修复草案",
  cover_image_generation: "历史封面生成",
  ending_planning_generation: "终局规划",
  foreshadow_recovery_audit: "伏笔回收审计",
  outline_generation: "大纲草案生成",
  pending_update_extraction: "待审核更新提取",
  project_setting_completion: "项目设定补全",
  project_setting_generation: "项目设定生成",
  project_setting_optimization: "项目设定优化",
  short_story_blueprint_generation: "短故事蓝图",
  short_story_unit_plan_generation: "写作单元规划",
  short_story_whole_review: "短故事整篇审校",
  storyline_generation: "故事线草案生成",
  wechat_layout_candidate_generation: "公众号排版候选",
  wechat_publish_packaging: "历史公众号发布包",
} as const;

export type AiTaskStatusTone =
  | "active"
  | "cancelled"
  | "failed"
  | "success"
  | "unknown";

export function aiTaskTypeLabel(taskType: string) {
  return (
    aiTaskTypeLabels[taskType as keyof typeof aiTaskTypeLabels] ??
    "其他 AI 任务"
  );
}

export function aiTaskStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "等待中",
    running: "执行中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };

  return labels[status] ?? "状态未知";
}

export function aiTaskStatusTone(status: string): AiTaskStatusTone {
  if (status === "pending" || status === "running") {
    return "active";
  }
  if (status === "completed") {
    return "success";
  }
  if (status === "failed") {
    return "failed";
  }
  if (status === "cancelled") {
    return "cancelled";
  }
  return "unknown";
}
