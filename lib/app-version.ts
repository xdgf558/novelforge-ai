import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.75 番茄草稿精修模板";

export const appReleaseNotes = [
  "章节草稿生成新增目标平台选择，可在通用连载和番茄小说模板之间切换。",
  "正文精修新增同样的目标平台选择；番茄模板会强化开篇钩子、爽点反转、短段落和章末追读感。",
  "平台模板只影响新的 AI 任务上下文和任务记录，不会自动改写正式正文或上传到番茄。",
];
