import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.23 Phase 22 结构化记忆管理页";

export const appReleaseNotes = [
  "新增结构化记忆管理页，集中维护世界观规则、伏笔池和时间线。",
  "世界观规则支持核心规则、适用范围、相关人物、地点和组织等管理字段。",
  "伏笔池支持状态、重要度、预计回收章节、埋设章节和回收章节维护。",
  "时间线事件支持故事内时间、地点、相关人物、关联章节和事件影响维护。",
];
