import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.22 Phase 21 大纲模块";

export const appReleaseNotes = [
  "新增大纲模块，支持卷大纲、剧情单元大纲和章节大纲的本地管理。",
  "新增 AI 大纲草案任务，模型输出只进入任务记录，正式大纲仍由作者手动整理确认。",
  "章节节拍和章节草稿生成会读取匹配当前章节的大纲上下文。",
  "项目首页、侧边栏和项目导出现在会显示或备份大纲数据。",
];
