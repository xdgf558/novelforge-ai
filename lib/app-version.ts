import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.31 发布页目标收敛";

export const appReleaseNotes = [
  "发布页现在把全局 Station Cat API 作为唯一默认主入口，主按钮直接显示为“发送到 Station Cat”。",
  "自动维护的“Station Cat 全局配置”同步目标不再作为普通作品后台卡片重复展示，只在主入口里显示最近发布结果。",
  "项目专属发布目标改为高级可选区域，适合备用网站、测试环境或特殊接口，不再干扰日常上传流程。",
];
