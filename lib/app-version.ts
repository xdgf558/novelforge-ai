import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.29 章节大纲预填章节";

export const appReleaseNotes = [
  "新建章节时会按下一章号自动读取匹配的正式章节大纲。",
  "章节大纲标题会预填到章节标题，大纲里的目标、冲突、爽点、伏笔、地点和章末钩子会整理进章节目标。",
  "预填内容仍然只是表单草稿，作者确认并点击创建后才会写入章节库。",
];
