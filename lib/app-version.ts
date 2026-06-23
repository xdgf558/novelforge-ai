import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.47 公众号排版导出增强";

export const appReleaseNotes = [
  "发布页新增公众号排版导出面板，自动按精修正文、定稿正文、草稿正文顺序读取章节内容。",
  "新增微信公众号正文粘贴版和完整发布版两种模板，支持一键复制正文、导出 TXT、Markdown 和 HTML。",
  "默认模式只排版不改文；AI 发布包装可作为标题、开头和结尾候选套用到表单，仍需作者确认后再复制或导出。",
];
