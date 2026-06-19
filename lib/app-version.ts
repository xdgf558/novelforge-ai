import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.11 AI 任务记录保留上限";

export const appReleaseNotes = [
  "AI 任务记录页现在只展示最近 10 条任务记录。",
  "新增项目级 AI 任务保留策略，旧的已结束任务会自动清理。",
  "正在执行中的 AI 任务不会被清理，避免后台生成完成后无法回写状态。",
  "任务记录统计会随保留策略更新，避免列表和数量显示不一致。",
];
