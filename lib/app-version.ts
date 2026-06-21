import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.30 修复建议与滚动体验";

export const appReleaseNotes = [
  "连续性检查的一键修复可从证据和建议中推断安全的时间戳替换，例如把 6 月 24 日凌晨修正为 6 月 25 日凌晨。",
  "一键修复仍然只在作者点击按钮后修改章节定稿正文，并会创建章节快照、标记报告已处理。",
  "表单类功能按钮提交后会恢复到原滚动位置，减少保存、采用、标记处理后跳回页面顶部的问题。",
];
