import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.48 发布导出紧凑化";

export const appReleaseNotes = [
  "压缩发布与导出页的书籍封面、发布包装记录和项目导出区域，让长篇项目的发布工作台更容易浏览。",
  "发布包装字段默认显示短摘要，并提供展开全文，标题候选、检查清单和 Markdown 发布版保持折叠审阅。",
  "项目导出面板新增紧凑预览模式，保留一键复制和下载能力，同时减少页面纵向占用。",
];
