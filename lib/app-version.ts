import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.74 番茄分章 TXT 包";

export const appReleaseNotes = [
  "番茄小说导出面板新增“分章 TXT 包”模板，可按 3000/4000/5000/自定义目标字数拆分长章。",
  "拆分导出会生成清单预览，并可下载包含拆分清单和多个 TXT 正文文件的 ZIP 包。",
  "所有番茄导出仍只做本地格式整理和下载，不改写章节、不写入数据库，也不自动上传。",
];
