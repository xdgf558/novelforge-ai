import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.19 项目最近活动时间修复";

export const appReleaseNotes = [
  "项目详情页的状态时间现在区分“项目创建”“首章创建”“项目资料更新”和“最近活动”。",
  "“最近活动”会统计章节、AI 任务、待审更新、连续性报告、发布包装和 Station Cat 发布记录。",
  "项目列表和最近活动区现在按真实创作活动排序，不再只看项目基础资料更新时间。",
  "Station Cat 指定章节上传、上传按钮反馈、以及上传正文自动清理开场钩子/节拍标题功能继续保留。",
];
