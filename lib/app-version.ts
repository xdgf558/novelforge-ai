import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.64 正文反模板腔约束";

export const appReleaseNotes = [
  "章节节拍、章节草稿和正文精修都加入反模板腔约束，减少“不是……而是……”等高频 AI 句式。",
  "草稿生成会优先用动作、细节、人物反应和因果推进表达含义，降低抽象总结感。",
  "正文精修会主动清理连续出现的二元对照句式，但不改变剧情事实、人物关系和正式设定。",
];
