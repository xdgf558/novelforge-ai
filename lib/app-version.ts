import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.70 故事线章节自动关联";

export const appReleaseNotes = [
  "新增章节时，会按章节号自动关联起止范围覆盖该章的正式故事线。",
  "保存或采用故事线时，会把起始章节到结束章节内的已有章节自动补入推进章节。",
  "故事线表单保留手动追加能力，范围外章节仍可由作者主动勾选。",
];
