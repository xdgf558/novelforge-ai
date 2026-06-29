import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.69 紧凑侧栏导航";

export const appReleaseNotes = [
  "左侧导航改为更紧凑的双列一级入口，减少长篇创作时的纵向占用。",
  "桌面侧栏从 320px 收窄到 288px，品牌区、图标和导航按钮尺寸同步压缩。",
  "隐藏底部“本地 SQLite 持久化”提示卡，保留本地持久化能力但不再占用导航空间。",
];
