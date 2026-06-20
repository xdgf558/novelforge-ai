import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.20 桌面启动兼容性修复";

export const appReleaseNotes = [
  "修复旧 SQLite 数据中混用毫秒时间戳和 SQLite 时间字符串时，项目首页可能返回 500 并导致桌面端启动超时的问题。",
  "项目最近活动读取现在兼容历史时间格式，不需要改动或清空现有小说数据。",
  "桌面端等待本地服务启动时会记录最后一次检查状态，未来同类启动失败会更容易定位。",
  "Station Cat 指定章节上传、上传按钮反馈、以及上传正文自动清理开场钩子/节拍标题功能继续保留。",
];
