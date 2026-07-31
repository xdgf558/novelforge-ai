import type { Character, Project } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, History, Save } from "lucide-react";
import {
  characterFieldGroups,
  characterStatusOptions,
  characterValuesFromRecord,
} from "@/lib/character-fields";

type CharacterFormProps = {
  action: (formData: FormData) => Promise<void>;
  character?: Character;
  project: Project;
  submitLabel: string;
  subtitle: string;
  title: string;
  versionCount?: number;
};

const inputClass =
  "min-h-11 rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 shadow-panel outline-none transition placeholder:text-ink-700/45 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15";

const labelClass = "text-sm font-medium text-ink-800";

export function CharacterForm({
  action,
  character,
  project,
  submitLabel,
  subtitle,
  title,
  versionCount,
}: CharacterFormProps) {
  const values = characterValuesFromRecord(character);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={
              character
                ? `/projects/${project.id}/characters/${character.id}`
                : `/projects/${project.id}/characters`
            }
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回角色库
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            {subtitle}
          </p>
        </div>

        {character ? (
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${project.id}/characters/${character.id}/history`}
          >
            <History aria-hidden="true" className="h-4 w-4" />
            历史版本 {versionCount ?? 0}
          </Link>
        ) : null}
      </div>

      <form action={action} className="space-y-5">
        <section className="grid gap-4 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className={labelClass}>角色姓名</span>
            <input
              className={inputClass}
              defaultValue={values.name}
              maxLength={120}
              name="name"
              placeholder="例如：沈照"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>角色状态</span>
            <select
              className={inputClass}
              defaultValue={values.status || "active"}
              name="status"
            >
              {characterStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {characterFieldGroups.map((group, index) => (
          <details
            className="nf-collapsible-snapshot"
            key={group.title}
            open={index === 0}
          >
            <summary>
              <span>
                <strong>{group.title}</strong>
                <small>{group.description}</small>
              </span>
              <span className="nf-collapsible-snapshot-meta">
                {group.fields.filter((field) => values[field.name].trim())
                  .length}
                /{group.fields.length} 已填写
              </span>
            </summary>

            <div className="nf-collapsible-snapshot-body grid gap-4 lg:grid-cols-2">
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
          </details>
        ))}

        <div className="nf-setting-savebar">
          <label className="min-w-60 flex-1">
            <span className={labelClass}>修改原因</span>
            <input
              className={`${inputClass} mt-1.5 min-h-10 w-full`}
              name="changeReason"
              placeholder="例如：初始角色档案、补全信息边界、调整人物弧光"
            />
          </label>

          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            type="submit"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {submitLabel}
          </button>
          <Link
            className="inline-flex min-h-10 items-center rounded-md border border-ink-950/15 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={
              character
                ? `/projects/${project.id}/characters/${character.id}`
                : `/projects/${project.id}/characters`
            }
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
