import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.33 AI 人物关系草案";

export const appReleaseNotes = [
  "人物关系网络新增 AI 草案生成面板，可根据项目设定、角色、大纲、已有关系和最近章节摘要生成候选关系。",
  "AI 关系草案不会自动写入正式记忆，作者需要点击“采用全部可用关系”后才会保存到人物关系网络。",
  "采用时会校验角色归属、过滤归档角色并跳过重复关系，避免 AI 建议污染正式关系库。",
];
