import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.68 Kimi 长文本写作超时修复";

export const appReleaseNotes = [
  "章节草稿生成和正文精修这类长文本写作任务的接口超时放宽到 10 分钟，降低 Kimi K2.6 写完整章节时 120 秒超时失败的概率。",
  "大纲、章节节拍、摘要、连续性检查等结构管理任务仍保持默认 120 秒超时，避免短任务卡住太久。",
  "超时错误提示会显示当前任务实际使用的秒数，方便判断是网络问题、供应商响应慢，还是输入过长。",
];
