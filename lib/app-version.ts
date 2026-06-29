import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.66 大纲复制与故事线看板加固";

export const appReleaseNotes = [
  "继续加固 AI 章节大纲复制：Markdown 标题段遇到“目标：”“章节范围：”等字段会停止收集，避免串到错误表单字段。",
  "故事线看板默认展示保留状态优先级，推进中故事线会排在已完成或已归档故事线前面。",
  "保留 0.1.65 的故事线收束提醒和历史折叠能力，正式状态仍由作者手动确认。",
];
