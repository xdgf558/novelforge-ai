import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.72 番茄导出核心库";

export const appReleaseNotes = [
  "新增番茄小说导出的核心纯函数，支持正文来源选择、清理、字数统计和校验提示。",
  "番茄正文默认从精修正文、定稿正文、草稿正文中按顺序取可用内容，不直接改写章节正文。",
  "为后续发布页番茄导出面板和分章 TXT 下载打好基础。",
];
