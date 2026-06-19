import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.7 待审更新反馈修复";

export const appReleaseNotes = [
  "待审更新批准按钮新增提交中状态，点击后会明确显示正在写入正式记忆。",
  "批准或拒绝完成后会在待审更新页顶部显示结果提示。",
  "已处理的待审更新卡片会显示处理时间，并说明是否已经写入正式记忆。",
  "保留作者审核原则：AI 建议只有批准后才会写入正式故事记忆。",
];
