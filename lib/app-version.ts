import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.65 大纲复制与故事线收束提醒";

export const appReleaseNotes = [
  "修复 AI 章节大纲草案复制到表单时，把“章节范围”误填为标题的问题。",
  "故事线看板默认只显示最近 3 条，其余故事线折叠到历史区域。",
  "故事线到达结束章节或关联章节均已定稿/发布时，只提示可能可以收束，由作者手动标记完成或归档。",
];
