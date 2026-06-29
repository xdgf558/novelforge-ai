import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.67 章节写作模型路由";

export const appReleaseNotes = [
  "新增章节写作模型路由：章节草稿生成和正文精修可以分别配置 Kimi K2.6 的 OpenAI-compatible 接口、模型和 API Key。",
  "大纲、章节节拍、连续性检查等结构管理任务继续使用默认 AI 接入，适合保持 DeepSeek V4 Pro 作为主编模型。",
  "AI 任务记录会继续保存实际使用的模型名称，便于回看每个环节由 DeepSeek 还是 Kimi 完成。",
];
