import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.46 分段正文精修";

export const appReleaseNotes = [
  "正文精修遇到超长章节时会自动拆分为多段后台精修，全部完成后再拼接成完整精修稿。",
  "分段精修仍保存为可审阅 AI 任务，作者点击采用后才会写入精修正文，不会直接改定稿。",
  "Google Gemini TTS 使用受限 JSON 读取和按 WAV 体积预算的分段上限，旧 PPQ 导出记录需新建 Gemini 导出。",
];
