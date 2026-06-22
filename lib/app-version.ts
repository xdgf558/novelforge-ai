import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.36 本机接入设置压缩优化";

export const appReleaseNotes = [
  "压缩本机接入设置页面的卡片、表单和间距，让 AI、图片、有声和发布参数在桌面窗口里更容易浏览。",
  "保留 0.1.35 的有声小说导出能力：PPQ TTS、ElevenLabs / DeepGram 模型选项、音色列表拉取和试听。",
  "本机密钥仍只保存在本机服务端配置文件中，模型调用、图片生成、音频导出和网站发布都不会写入正式故事记忆。",
];
