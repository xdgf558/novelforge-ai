import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.61 AI 故事线草案生成";

export const appReleaseNotes = [
  "多故事线页面新增 AI 故事线候选生成，会读取总设定、角色、伏笔、章节摘要、大纲和已有故事线，给出可审阅草案。",
  "AI 候选可以直接填入正式故事线表单，但必须由作者确认保存后才会写入正式故事线和关联关系。",
  "故事线生成任务接入 AI 任务记录、预算提醒和卡死任务清理，保持可追踪、可恢复、作者可控。",
];
