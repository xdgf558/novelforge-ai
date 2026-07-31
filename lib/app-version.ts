import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.111 全路线工作区补全";

export const appReleaseNotes = [
  "设定、章节、角色、短故事系列和历史快照等子页面已统一为紧凑的分阶段工作区。",
  "待审核更新与连续性报告采用主从审查布局，并保留筛选、页码和当前记录的操作上下文。",
  "修复嵌套页面锚点、设置保存返回标签和隐藏保存栏状态，桌面与移动端导航保持一致。",
];
