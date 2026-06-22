import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.38 本机代理网络修复";

export const appReleaseNotes = [
  "新增本机网络代理配置，GUI 启动的桌面 App 可通过 HTTP/HTTPS/ALL_PROXY 访问 PPQ、DeepSeek、图片和 Station Cat 接口。",
  "模型、图片、有声和发布请求统一使用代理感知 fetch，修复桌面端音色列表刷新时的 fetch failed 问题。",
  "保留 0.1.37 的有声按钮提交中反馈、音色列表回退重试和紧凑本机接入设置布局。",
];
