import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.34 人物关系 AI 发布版";

export const appReleaseNotes = [
  "人物关系网络的 AI 草案生成功能已合并进主线，可根据项目设定、角色、大纲、已有关系和最近章节摘要生成候选关系。",
  "采用关系草案时会先确认至少有一条非重复关系可写入，再把任务标记为已采用，避免空采用污染任务记录。",
  "关系生成上下文会裁剪超长角色字段，减少长篇角色库带来的 prompt 过长和调用失败风险。",
];
