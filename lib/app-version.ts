import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.63 AI 任务页紧凑化";

export const appReleaseNotes = [
  "AI 任务记录页改成更紧凑的管理视图，顶部统计卡避免长接口地址撑出卡片。",
  "Prompt Templates 默认只展示最近 3 个模板版本，历史模板折叠保留可查看、复制和管理。",
  "Recent Tasks 默认只展示最新 3 条任务记录，其余任务折叠，长篇项目扫记录时更清爽。",
];
