import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.71 强化正文反模板腔";

export const appReleaseNotes = [
  "章节草稿和正文精修默认模板升级到 v2，旧项目生成时会自动使用新版默认模板。",
  "把“不是……而是……”等二元对照句式从软性少用改为硬性自检：全文最多保留 1 处。",
  "Kimi 等长文模型生成前会收到更明确的反模板腔改写要求，降低 AI 味重复句式。",
];
