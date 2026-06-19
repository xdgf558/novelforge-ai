import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.9 侧边栏导航修复";

export const appReleaseNotes = [
  "侧边栏创作工具现在会用当前项目或最近项目生成链接，不在项目详情页也可以点击进入。",
  "侧边栏加入独立滚动，窗口高度较小时不会再截断本地 SQLite 持久化卡片。",
  "项目详情页仍显示待审核、已批准、已拒绝的待审更新状态。",
  "保留作者审核原则：AI 建议只有批准后才会写入正式故事记忆。",
];
