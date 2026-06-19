import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.10 侧边栏点击修复";

export const appReleaseNotes = [
  "修复主内容层覆盖侧边栏导致创作工具看似可点、实际无反应的问题。",
  "窗口高度较小时会隐藏侧边栏装饰插画，避免本地 SQLite 持久化卡片只露出一半。",
  "侧边栏创作工具继续支持当前项目或最近项目兜底跳转。",
  "项目详情页仍显示待审核、已批准、已拒绝的待审更新状态。",
];
