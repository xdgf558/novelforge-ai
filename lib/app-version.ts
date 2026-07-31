import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.113 连续性报告布局修复";

export const appReleaseNotes = [
  "修复连续性报告在 AI 运行台打开时，长问题标题被过度挤压的问题。",
  "报告详情会根据实际内容区宽度自动切换为纵向或双栏布局。",
  "连续性报告的处理、定位和 AI 修复候选功能保持不变。",
];
