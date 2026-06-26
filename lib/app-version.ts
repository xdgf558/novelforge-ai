import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.56 Station Cat 反馈接口命名空间";

export const appReleaseNotes = [
  "读者反馈拉取路径切换到 Station Cat 的 NovelForge 专用命名空间：/api/novelforge/analytics。",
  "软件端仍只需要配置 Station Cat API Base URL、Publish Token 和远端章节 ID，会自动拼接统计与洞察接口。",
  "保留 0.1.55 的反馈驱动下一章生成能力，读者反馈仍只作为压缩参考上下文。",
];
