import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.8 项目导航与状态修复";

export const appReleaseNotes = [
  "项目详情页的待审更新卡片改为显示待审核、已批准、已拒绝状态，不再只显示总数。",
  "侧边栏创作工具在项目上下文中可直接进入设定库、角色、章节和任务记录。",
  "侧边栏会根据当前页面高亮项目入口或对应创作工具。",
  "保留作者审核原则：AI 建议只有批准后才会写入正式故事记忆。",
];
