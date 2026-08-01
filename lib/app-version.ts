import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.115 AI 任务中断恢复";

export const appReleaseNotes = [
  "桌面应用重启后，会立即结束上次未完成的 AI 任务，避免界面长期停留在运行中。",
  "中断任务会显示明确的重新生成提示，已完成和已取消任务保持不变。",
  "启动清理失败只记录日志，不会阻止应用打开；原有超时清理继续兜底。",
];
