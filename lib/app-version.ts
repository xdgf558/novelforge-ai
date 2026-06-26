import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.57 连续性修复候选补丁";

export const appReleaseNotes = [
  "连续性检查报告新增 AI 修复候选补丁，可为时间线、人物边界和伏笔问题生成可审阅的查找/替换建议或改写片段。",
  "候选补丁只写入 AI 任务记录，不会自动修改章节正文、正式设定、角色、时间线或伏笔；作者整理后可标记已整理或忽略。",
  "保留原有一键修复边界：只有明确“将 A 改为 B”的报告才会在作者点击后修改定稿正文并创建章节快照。",
];
