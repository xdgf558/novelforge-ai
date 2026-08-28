import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.117 Terra 结构模型升级";

export const appReleaseNotes = [
  "设定、大纲、节拍、摘要、记忆提取和连续性检查统一使用 GPT-5.6 Terra，并固定为极高推理强度。",
  "默认结构模型现使用 OpenAI 官方接口；旧 DeepSeek 或自定义默认连接不会把原凭据发送给 OpenAI。",
  "升级后请在设置的 Terra 接入页填写 OpenAI API Key；Kimi 与 Luna 写作路由仍保持独立配置。",
];
