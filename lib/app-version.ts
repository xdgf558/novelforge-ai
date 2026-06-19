import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.13 定稿正文引导优化";

export const appReleaseNotes = [
  "章节摘要、待审更新、连续性检查和发布包装在缺少定稿正文时，会直接提示下一步操作。",
  "提示里新增“去填写定稿正文”入口，可跳转到章节编辑页对应字段。",
  "章节编辑页的定稿正文字段增加稳定锚点，方便从 AI 面板快速定位。",
  "AI 仍只读取作者确认后的定稿正文，草稿不会被误用为正式记忆来源。",
];
