import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.51 长篇管理效率与成本提醒";

export const appReleaseNotes = [
  "角色库、结构化记忆和大纲页增加搜索筛选与紧凑管理能力，长篇项目数据变多后更容易查找和维护。",
  "角色详情新增出场记录视图，大纲页显示范围内章节创建、定稿和发布进度，章节状态变化会同步推进相关大纲状态。",
  "AI 任务页新增今日调用与 token 用量统计，项目设置可配置每日 token 提醒阈值，生成入口会给出非阻断预算提示。",
];
