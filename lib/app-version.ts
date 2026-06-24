import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.52 结构化记忆对比度修复";

export const appReleaseNotes = [
  "修复结构化记忆页在深色主题下的低对比度问题，世界观、伏笔和时间线长文本展开区改为深色高对比信息块。",
  "优化记忆卡片状态标签、来源章节、更新时间、影响说明和归档/废弃按钮的可读性。",
  "保留 0.1.51 的角色筛选、记忆筛选、大纲进度追踪和 AI 用量/预算提醒能力。",
];
