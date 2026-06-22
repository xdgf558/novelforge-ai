import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.37 有声音色刷新修复";

export const appReleaseNotes = [
  "修复 PPQ TTS 音色列表刷新体验：语言过滤失败时会自动回退重试，并显示更具体的失败原因。",
  "有声相关按钮增加提交中反馈，刷新音色、试听音色、保存设置、开始导出、重试分段和打开目录都会立即显示处理中状态。",
  "保留 0.1.36 的紧凑本机接入设置布局，密钥仍只保存在本机服务端配置文件中。",
];
