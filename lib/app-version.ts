import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.24 Phase 23 人物关系网络与人物 AI";

export const appReleaseNotes = [
  "新增人物关系网络，集中维护角色之间的同盟、冲突、隐秘关系和阶段变化。",
  "人物关系支持来源章节、证据、关系方向、状态归档和项目导出。",
  "新增 AI 人物草案生成，任务会进入 AI 审计记录，作者点击采用后才创建正式角色。",
  "人物生成会参考项目设定、已有角色、人物关系和大纲，并释放超时任务避免按钮锁死。",
];
