import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.54 读者反馈回流";

export const appReleaseNotes = [
  "章节详情页新增“读者反馈”面板，可从 Station Cat 拉取章节阅读表现和读者洞察快照。",
  "新增本地 chapter_analytics / chapter_insights 记录，保存阅读量、完成率、流失点、互动分、洞察摘要和原始 JSON，方便后续复盘。",
  "读者数据只作为作者参考，不会自动修改正文、设定、角色、大纲、伏笔或故事记忆。",
];
