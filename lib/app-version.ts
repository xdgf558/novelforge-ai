import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.35 有声导出首版";

export const appReleaseNotes = [
  "新增有声小说导出入口，可按章节把精修正文、定稿正文或草稿正文分段合成为本地音频文件。",
  "新增 PPQ TTS 设置、ElevenLabs / DeepGram 模型选项、音色列表拉取和音色试听，API Key 仍只保存在本机服务端配置中。",
  "有声导出会保存导出任务与分段状态，失败分段可重试，音频文件通过受控本地资产路由播放，不写入正式故事记忆。",
];
