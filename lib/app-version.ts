import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.109 字数上限收尾约束";

export const appReleaseNotes = [
  "达到总字数目标，或剩余预算只容纳一章时，下一章大纲默认承担全书完结。",
  "大纲页会同时显示字数约束与未回收伏笔风险，并允许单次跳过强制收尾。",
  "页面提示与实际生成统一使用同一个目标章号，不会自动改写正式大纲或正文。",
];
