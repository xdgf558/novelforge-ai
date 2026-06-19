import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.6 MVP 验收补齐";

export const appReleaseNotes = [
  "总设定页新增 AI 总设定草案生成入口，任务会在后台运行并写入 project_setting_generation 审计记录。",
  "AI 总设定草案必须作者点击采用后才会写入正式总设定档，并生成设置历史版本。",
  "MVP 验收看板修正待审更新批准状态判断，兼容 approved 和旧的 applied 状态。",
  "总设定生成任务支持自动刷新和 15 分钟超时清理，避免按钮长期锁住。",
];
