import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Database,
  KeyRound,
  Save,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { saveAiConnectionSettingsAction } from "@/app/ai-settings/actions";
import { readAiConnectionSettings } from "@/lib/ai/local-config";

export const dynamic = "force-dynamic";

export default function AiSettingsPage() {
  const settings = readAiConnectionSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回项目
          </Link>
          <p className="text-sm font-semibold text-signal-600">本机配置</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            AI 接入设置
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            配置本机模型调用参数。API Key 只保存在本机配置文件中，AI 调用仍由服务端执行。
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoTile
          icon={KeyRound}
          label="API Key"
          value={settings.hasApiKey ? settings.maskedApiKey : "未配置"}
        />
        <InfoTile icon={Bot} label="模型" value={settings.model} />
        <InfoTile
          icon={ServerCog}
          label="接口地址"
          value={settings.baseUrl}
        />
      </section>

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="mb-5 flex items-center gap-2 text-base font-semibold text-ink-950">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-signal-600" />
          接入参数
        </div>

        <form action={saveAiConnectionSettingsAction} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">API Key</span>
              <input
                autoComplete="off"
                className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                name="apiKey"
                placeholder={
                  settings.hasApiKey ? "留空则保留当前 API Key" : "输入 API Key"
                }
                type="password"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">模型名称</span>
              <input
                className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                defaultValue={settings.model}
                name="model"
                placeholder="自定义模型 id"
                type="text"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink-800">
              OpenAI-compatible 接口地址
            </span>
            <input
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={settings.baseUrl}
              name="baseUrl"
              placeholder="https://api.example.com/v1"
              type="url"
            />
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4 text-sm text-ink-700">
            <input
              className="mt-1 h-4 w-4 rounded border-ink-950/20 text-signal-600"
              name="clearApiKey"
              type="checkbox"
            />
            <span>
              <span className="block font-semibold text-ink-950">
                清除已保存的 API Key
              </span>
              <span className="mt-1 block leading-6">
                勾选后保存会移除本机配置文件中的 key，模型名称和接口地址仍会保存。
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 border-t border-ink-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-ink-700">
              <span className="font-semibold text-ink-950">配置文件：</span>
              <span className="break-all">{settings.configPath}</span>
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
              type="submit"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              保存设置
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <Database aria-hidden="true" className="mt-0.5 h-5 w-5 text-signal-600" />
          <div>
            <h2 className="text-base font-semibold text-ink-950">本地保存状态</h2>
            <p className="mt-2 text-sm leading-6 text-ink-700">
              当前来源：{sourceLabel(settings.source)}；配置文件
              {settings.fileExists ? "已存在" : "尚未创建"}。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {label}
      </div>
      <p className="mt-3 break-all text-lg font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function sourceLabel(source: "file" | "environment" | "default") {
  if (source === "file") {
    return "本机配置文件";
  }

  if (source === "environment") {
    return "进程环境变量";
  }

  return "默认值";
}
