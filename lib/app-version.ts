import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.39 有声音色试听修复";

export const appReleaseNotes = [
  "修复刷新音色后未保存音色时，试听按钮没有传入 voice ID 导致试听失败的问题。",
  "音色列表加载成功后，如果当前没有已保存音色，会自动选中列表第一条，可直接点击试听。",
  "保留 0.1.38 的本机代理网络修复，AI、图片、有声和发布请求仍会使用本机代理配置。",
];
