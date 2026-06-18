import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.4 AI 后台生成体验修复";

export const appReleaseNotes = [
  "AI 章节节拍、章节草稿、章节摘要会在后台运行，点击后页面立即返回并自动刷新结果。",
  "待审核更新、连续性检查、发布包装也改为后台执行，模型完成后自动写入对应记录。",
  "设置页与顶部工具栏显示当前版本和本次更新内容，方便确认安装包是否已升级。",
  "保留 15 分钟超时清理，异常任务会自动标记失败，避免生成按钮长期锁住。",
];
