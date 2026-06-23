import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.44 TTS 多语言音色修复";

export const appReleaseNotes = [
  "修复 PPQ / ElevenLabs 音色返回 language=multi 时，试听错误提交 language_code=multi 的问题。",
  "旧配置中已保存的 multi / multilingual / auto 等泛语言标签会自动回退为中文 zh。",
  "保留 0.1.43 的模块紧凑化设计和 0.1.41 的 TTS/代理兼容修复。",
];
