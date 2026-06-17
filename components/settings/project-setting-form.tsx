import type { Project, ProjectSetting } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, History, Save } from "lucide-react";
import {
  emptyProjectSettingValues,
  projectSettingGroups,
  type ProjectSettingValues,
} from "@/lib/project-setting-fields";

type ProjectSettingFormProps = {
  action: (formData: FormData) => Promise<void>;
  project: Project;
  setting?: ProjectSetting | null;
  versionCount: number;
};

const inputClass =
  "min-h-11 rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 shadow-panel outline-none transition placeholder:text-ink-700/45 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15";

const labelClass = "text-sm font-medium text-ink-800";

function valuesFromSetting(setting?: ProjectSetting | null): ProjectSettingValues {
  return {
    ...emptyProjectSettingValues(),
    genre: setting?.genre ?? "",
    targetAudience: setting?.targetAudience ?? "",
    sellingPoint: setting?.sellingPoint ?? "",
    mainConflict: setting?.mainConflict ?? "",
    worldviewRules: setting?.worldviewRules ?? "",
    protagonistDesire: setting?.protagonistDesire ?? "",
    protagonistFlaw: setting?.protagonistFlaw ?? "",
    villainLogic: setting?.villainLogic ?? "",
    supportingCharacters: setting?.supportingCharacters ?? "",
    factions: setting?.factions ?? "",
    timeline: setting?.timeline ?? "",
    pleasureMechanism: setting?.pleasureMechanism ?? "",
    forbiddenItems: setting?.forbiddenItems ?? "",
    styleSample: setting?.styleSample ?? "",
    wechatPositioning: setting?.wechatPositioning ?? "",
    emotionalTone: setting?.emotionalTone ?? "",
    readerExpectation: setting?.readerExpectation ?? "",
    commercialHook: setting?.commercialHook ?? "",
    longTermForeshadowing: setting?.longTermForeshadowing ?? "",
    endingDirection: setting?.endingDirection ?? "",
    sensitiveContentRules: setting?.sensitiveContentRules ?? "",
  };
}

export function ProjectSettingForm({
  action,
  project,
  setting,
  versionCount,
}: ProjectSettingFormProps) {
  const values = valuesFromSetting(setting);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${project.id}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回项目
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            总设定档
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            这里保存全书长期记忆的基础版本。每次保存都会生成一条历史快照，方便后续追踪和回溯。
          </p>
        </div>

        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
          href={`/projects/${project.id}/settings/history`}
        >
          <History aria-hidden="true" className="h-4 w-4" />
          历史版本 {versionCount}
        </Link>
      </div>

      <form action={action} className="space-y-5">
        {projectSettingGroups.map((group) => (
          <section
            className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
            key={group.title}
          >
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                {group.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                {group.description}
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {group.fields.map((field) => (
                <label className="flex flex-col gap-2" key={field.name}>
                  <span className={labelClass}>{field.label}</span>
                  <textarea
                    className={`${inputClass} py-3 leading-6`}
                    defaultValue={values[field.name]}
                    name={field.name}
                    placeholder={field.placeholder}
                    rows={field.rows}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
          <label className="flex flex-col gap-2">
            <span className={labelClass}>修改原因</span>
            <textarea
              className={`${inputClass} min-h-24 py-3 leading-6`}
              name="changeReason"
              placeholder="例如：初版设定、补全主线矛盾、调整公众号定位"
            />
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            type="submit"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            保存并记录版本
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-md border border-ink-950/15 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${project.id}`}
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}

