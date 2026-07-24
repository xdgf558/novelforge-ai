import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.106 Kimi 长文本流式生成";

export const appReleaseNotes = [
  "章节草稿、正文精修和短故事整篇审校改为流式接收长文本。",
  "生成持续返回内容时不再因总耗时达到 600 秒而失败。",
  "流式结果只有完整结束后才可采用，断流的半成品不会写入正文。",
];
