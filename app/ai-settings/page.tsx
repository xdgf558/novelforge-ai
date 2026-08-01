import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Database,
  Globe2,
  Headphones,
  KeyRound,
  PackageCheck,
  ServerCog,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
  UploadCloud,
} from "lucide-react";
import {
  createLocalBackupAction,
  openLocalBackupDirectoryAction,
  previewTtsVoiceAction,
  saveAiConnectionSettingsAction,
  saveAiTaskModelRouteSettingsAction,
  saveStationCatPublishSettingsAction,
  saveTtsGenerationSettingsAction,
} from "@/app/ai-settings/actions";
import { FormActionButton } from "@/components/form-action-button";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import {
  readAiConnectionSettings,
  readAiTaskModelRouteSettings,
  GPT_5_6_LUNA_MODEL,
  type AiTaskModelRouteSetting,
  type TtsGenerationSettings,
  readNetworkProxySettings,
  readStationCatPublishSettings,
  readTtsGenerationSettings,
} from "@/lib/ai/local-config";
import {
  appReleaseNotes,
  appReleaseTitle,
  appVersion,
} from "@/lib/app-version";
import {
  getConfiguredTtsProvider,
  ttsModelOptions,
  ttsProviderOptions,
} from "@/lib/audio/providers/registry";
import type { TtsVoice } from "@/lib/audio/providers/types";
import { getLocalBackupRoot, listLocalBackups } from "@/lib/local-backups";
import { publishModeLabel, publishModeOptions } from "@/lib/publish-platforms";

export const dynamic = "force-dynamic";

type AiSettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    ttsLanguage?: string;
    ttsModel?: string;
    ttsError?: string;
    ttsPreviewPath?: string;
    ttsVoices?: string;
    backupError?: string;
    backupFile?: string;
    backupFiles?: string;
    backupSize?: string;
  }>;
};

export default async function AiSettingsPage({
  searchParams,
}: AiSettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const settings = readAiConnectionSettings();
  const writingModelRouteSettings = readAiTaskModelRouteSettings();
  const ttsSettings = readTtsGenerationSettings();
  const stationCatSettings = readStationCatPublishSettings();
  const networkProxySettings = readNetworkProxySettings();
  const localBackups = await listLocalBackups();
  const localBackupRoot = getLocalBackupRoot();
  const activeTtsModel = resolvedSearchParams?.ttsModel || ttsSettings.model;
  const activeTtsLanguage =
    resolvedSearchParams?.ttsLanguage || ttsSettings.languageCode;
  const activeTtsProviderLabel =
    ttsProviderOptions.find((option) => option.value === ttsSettings.providerId)
      ?.label ?? "当前 TTS 供应商";
  const savedMessage = settingsSavedMessage(resolvedSearchParams?.saved, {
    backupError: resolvedSearchParams?.backupError,
    backupFile: resolvedSearchParams?.backupFile,
    backupFiles: resolvedSearchParams?.backupFiles,
    backupSize: resolvedSearchParams?.backupSize,
    ttsError: resolvedSearchParams?.ttsError,
  });
  const ttsVoiceLookup = await loadTtsVoicesForSettings({
    enabled: resolvedSearchParams?.ttsVoices === "1",
    languageCode: activeTtsLanguage,
    modelId: activeTtsModel,
  });
  const ttsPreviewPath = resolvedSearchParams?.ttsPreviewPath;

  return (
    <div className="nf-compact-settings space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回项目
          </Link>
          <p className="text-sm font-semibold text-signal-600">本机配置</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            本机接入设置
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-ink-700">
            配置本机模型调用和个人网站发布参数。密钥只保存在本机配置文件中，模型调用和网站发布都由服务端执行。
          </p>
        </div>
      </div>

      {savedMessage ? (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm leading-6 ${
            savedMessage.kind === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-signal-600/25 bg-signal-600/10 text-ink-800"
          }`}
          role="status"
        >
          {savedMessage.kind === "error" ? (
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
            />
          ) : (
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-signal-600"
            />
          )}
          <div>
            <p
              className={`font-semibold ${
                savedMessage.kind === "error" ? "text-red-900" : "text-ink-950"
              }`}
            >
              {savedMessage.title}
            </p>
            <p>{savedMessage.description}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <InfoTile
          icon={KeyRound}
          label="AI API Key"
          value={settings.hasApiKey ? settings.maskedApiKey : "未配置"}
        />
        <InfoTile icon={Bot} label="模型" value={settings.model} />
        <InfoTile icon={ServerCog} label="接口地址" value={settings.baseUrl} />
        <InfoTile
          icon={ServerCog}
          label="网络代理"
          value={networkProxySettings.proxyUrl || "未设置"}
        />
        <InfoTile
          icon={Globe2}
          label="Station Cat"
          value={stationCatSettings.apiBaseUrl}
        />
        <InfoTile
          icon={Headphones}
          label="有声导出模型"
          value={ttsSettings.model}
        />
        <InfoTile
          icon={KeyRound}
          label="TTS API Key"
          value={ttsSettings.hasApiKey ? ttsSettings.maskedApiKey : "未配置"}
        />
        <InfoTile
          icon={UploadCloud}
          label="发布 Token"
          value={
            stationCatSettings.hasToken
              ? stationCatSettings.maskedToken
              : "未配置"
          }
        />
        <InfoTile
          icon={ShieldCheck}
          label="默认发布模式"
          value={publishModeLabel(stationCatSettings.defaultMode)}
        />
        <InfoTile
          icon={PackageCheck}
          label="当前版本"
          value={`v${appVersion}`}
        />
      </section>

      <WorkspaceTabs
        ariaLabel="本机接入设置分区"
        tabs={[
          {
            id: "writing-model-routes",
            label: "写作模型",
            meta: routeStatusText(
              writingModelRouteSettings.routes.chapterPolish,
            ),
            content: (
              <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
                <div className="mb-5 flex items-start gap-3">
                  <Bot
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 text-signal-600"
                  />
                  <div>
                    <h2 className="text-base font-semibold text-ink-950">
                      章节写作模型路由
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
                      章节草稿默认使用 Kimi K2.6，也可切换为 GPT-5.6
                      Luna。Luna 使用 OpenAI API 接入，并固定为极高推理强度；正文精修与短故事整篇审校默认使用 Kimi
                      K3。两条路由可共享同一套草稿 API Key 和 Base URL，也可为精修单独配置。大纲、节拍和普通连续性检查保持默认模型。
                    </p>
                  </div>
                </div>

                <form
                  action={saveAiTaskModelRouteSettingsAction}
                  className="space-y-5"
                >
                  <div className="grid gap-5 lg:grid-cols-2">
                    <AiTaskRouteFields
                      apiKeyName="draftApiKey"
                      baseUrlName="draftBaseUrl"
                      clearKeyName="clearDraftApiKey"
                      modelName="draftModel"
                      route={writingModelRouteSettings.routes.chapterDraft}
                      supportsGpt56Luna
                    />
                    <AiTaskRouteFields
                      apiKeyName="polishApiKey"
                      baseUrlName="polishBaseUrl"
                      clearKeyName="clearPolishApiKey"
                      modelName="polishModel"
                      allowDraftConnectionReuse
                      route={writingModelRouteSettings.routes.chapterPolish}
                    />
                  </div>

                  <div className="flex flex-col gap-3 border-t border-ink-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm leading-6 text-ink-700">
                      <span className="font-semibold text-ink-950">
                        当前路由：
                      </span>
                      <span>
                        草稿{" "}
                        {routeStatusText(
                          writingModelRouteSettings.routes.chapterDraft,
                        )}
                        ；精修{" "}
                        {routeStatusText(
                          writingModelRouteSettings.routes.chapterPolish,
                        )}
                      </span>
                    </div>
                    <FormActionButton
                      icon="save"
                      idleLabel="保存写作模型路由"
                      name="aiRouteSettingsAction"
                      pendingLabel="保存中..."
                      statusText="正在保存章节草稿和正文精修的模型路由。"
                      value="save"
                      variant="dark"
                    />
                  </div>
                </form>
              </section>
            ),
          },
          {
            id: "tts-settings",
            label: "有声输出",
            meta: ttsSettings.hasApiKey ? "已配置" : "未配置",
            content: (
              <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-base font-semibold text-ink-950">
                      <Headphones
                        aria-hidden="true"
                        className="h-5 w-5 text-signal-600"
                      />
                      有声小说导出参数
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
                      使用当前 TTS 供应商生成本地 WAV
                      音频。音频导出默认读取个人网站正式发布正文并生成本地音频文件，不会修改章节和故事记忆。
                    </p>
                  </div>
                  <form
                    action="/ai-settings#tts-settings"
                    className="flex flex-wrap gap-2"
                    method="get"
                  >
                    <input name="ttsVoices" type="hidden" value="1" />
                    <select
                      className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                      defaultValue={activeTtsModel}
                      name="ttsModel"
                    >
                      {ttsModelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="min-h-10 w-24 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                      defaultValue={activeTtsLanguage}
                      name="ttsLanguage"
                      placeholder="cmn"
                      type="text"
                    />
                    <FormActionButton
                      icon="refresh"
                      idleLabel="刷新音色列表"
                      name="ttsVoiceLookupAction"
                      pendingLabel="刷新中..."
                      statusText="正在读取当前 TTS 供应商可用音色，完成后会显示列表。"
                      value="refresh"
                    />
                  </form>
                </div>

                <form
                  action={saveTtsGenerationSettingsAction}
                  className="space-y-5"
                >
                  <div className="grid gap-5 lg:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        TTS 供应商
                      </span>
                      <select
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={ttsSettings.providerId}
                        name="ttsProviderId"
                      >
                        {ttsProviderOptions.map((option) => (
                          <option
                            disabled={option.disabled}
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        TTS API Base URL
                      </span>
                      <input
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={ttsSettings.apiBaseUrl}
                        name="ttsApiBaseUrl"
                        placeholder="https://generativelanguage.googleapis.com/v1beta"
                        type="url"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        TTS 模型
                      </span>
                      <select
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={activeTtsModel}
                        name="ttsModel"
                      >
                        {ttsModelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        语言
                      </span>
                      <input
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={activeTtsLanguage}
                        name="ttsLanguageCode"
                        placeholder="cmn"
                        type="text"
                      />
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-ink-800">
                      TTS API Key
                    </span>
                    <input
                      autoComplete="off"
                      className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                      name="ttsApiKey"
                      placeholder={
                        ttsSettings.hasApiKey
                          ? "留空则保留当前 TTS API Key"
                          : "输入当前 TTS API Key"
                      }
                      type="password"
                    />
                  </label>

                  <div className="space-y-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink-950">
                          音色
                        </p>
                        <p className="text-xs leading-5 text-ink-700">
                          可以从刷新后的列表选择，也可以在高级输入里手填当前供应商的
                          voice name。
                        </p>
                      </div>
                      <span className="text-xs text-ink-700">
                        当前：
                        {ttsSettings.voiceName ||
                          ttsSettings.voiceId ||
                          "未设置"}
                      </span>
                    </div>

                    {ttsVoiceLookup.kind === "loaded" &&
                    ttsVoiceLookup.voices.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {ttsVoiceLookup.voices
                          .slice(0, 24)
                          .map((voice, index) => (
                            <label
                              className="flex cursor-pointer gap-3 rounded-md border border-ink-950/10 bg-white p-3 text-sm transition hover:border-signal-600/40"
                              key={voice.id}
                            >
                              <input
                                className="mt-1 h-4 w-4 border-ink-950/20 text-signal-600"
                                defaultChecked={
                                  voice.id === ttsSettings.voiceId ||
                                  (!ttsSettings.voiceId && index === 0)
                                }
                                name="ttsVoiceSelection"
                                type="radio"
                                value={`${voice.id}|||${voice.name}|||${voice.languageCode || ""}`}
                              />
                              <span>
                                <span className="block font-semibold text-ink-950">
                                  {voice.name}
                                </span>
                                <span className="mt-1 block break-all text-xs leading-5 text-ink-700">
                                  {voice.id}
                                  {voice.languageCode
                                    ? ` / ${voice.languageCode}`
                                    : ""}
                                  {voice.provider ? ` / ${voice.provider}` : ""}
                                </span>
                              </span>
                            </label>
                          ))}
                      </div>
                    ) : (
                      <p className="rounded-md border border-dashed border-ink-950/15 bg-white px-3 py-3 text-sm leading-6 text-ink-700">
                        {ttsVoiceLookup.kind === "error"
                          ? ttsVoiceLookup.message
                          : `点击“刷新音色列表”后，可以在这里选择 ${activeTtsProviderLabel} 可用音色。`}
                      </p>
                    )}

                    <input
                      name="ttsVoiceName"
                      type="hidden"
                      value={ttsSettings.voiceName}
                    />
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold text-ink-700">
                        手填 voice name
                      </span>
                      <input
                        className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={ttsSettings.voiceId}
                        name="ttsVoiceId"
                        placeholder="例如：Kore"
                        type="text"
                      />
                    </label>

                    <div className="flex flex-col gap-2 border-t border-ink-950/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-ink-700">
                        选中列表音色或填写 voice name
                        后保存；后续试听和章节导出会自动使用这个音色。
                      </p>
                      <FormActionButton
                        formAction={saveTtsGenerationSettingsAction}
                        icon="save"
                        idleLabel="保存当前音色"
                        name="ttsSettingsAction"
                        pendingLabel="保存音色中..."
                        statusText="正在保存当前选择的 voice name。"
                        value="save-voice"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        输出格式
                      </span>
                      <select
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={ttsSettings.outputFormat}
                        name="ttsOutputFormat"
                      >
                        <option value="wav">WAV</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        试听文本
                      </span>
                      <textarea
                        className="min-h-24 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue="1999年的夏天，县城的风扇声嗡嗡作响。陈远站在老旧电脑前，看着屏幕上那行白字，忽然笑了。 “这一次，”他说，“我不想再被时代推着走了。”"
                        maxLength={500}
                        name="ttsPreviewText"
                      />
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-ink-800">
                      默认风格提示词
                    </span>
                    <textarea
                      className="min-h-24 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                      defaultValue={ttsSettings.stylePrompt}
                      maxLength={1200}
                      name="ttsStylePrompt"
                      placeholder="例如：中文长篇小说旁白，语气自然沉稳，保留对白情绪。"
                    />
                  </label>

                  {ttsPreviewPath ? (
                    <div className="rounded-lg border border-signal-600/25 bg-signal-600/10 p-4">
                      <p className="text-sm font-semibold text-ink-950">
                        试听结果
                      </p>
                      <audio
                        className="mt-3 w-full"
                        controls
                        src={`/audio-assets?assetPath=${encodeURIComponent(ttsPreviewPath)}`}
                      />
                    </div>
                  ) : null}

                  <label className="flex items-start gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4 text-sm text-ink-700">
                    <input
                      className="mt-1 h-4 w-4 rounded border-ink-950/20 text-signal-600"
                      name="clearTtsApiKey"
                      type="checkbox"
                    />
                    <span>
                      <span className="block font-semibold text-ink-950">
                        清除已保存的 TTS API Key
                      </span>
                      <span className="mt-1 block leading-6">
                        勾选后保存会移除本机 TTS
                        key，模型、接口、音色和风格提示词仍会保存。
                      </span>
                    </span>
                  </label>

                  <div className="flex flex-col gap-3 border-t border-ink-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm leading-6 text-ink-700">
                      <span className="font-semibold text-ink-950">
                        TTS 接口：
                      </span>
                      <span className="break-all">
                        {formatTtsEndpointPreview(ttsSettings)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <FormActionButton
                        formAction={previewTtsVoiceAction}
                        icon="volume"
                        idleLabel="试听音色"
                        name="ttsSettingsAction"
                        pendingLabel="试听生成中..."
                        statusText="正在调用当前 TTS 供应商生成试听音频。"
                        value="preview"
                      />
                      <FormActionButton
                        icon="save"
                        idleLabel="保存有声导出设置"
                        name="ttsSettingsAction"
                        pendingLabel="保存中..."
                        statusText="正在保存有声导出参数。"
                        value="save"
                        variant="dark"
                      />
                    </div>
                  </div>
                </form>
              </section>
            ),
          },
          {
            id: "default-ai-connection",
            label: "默认接入",
            meta: settings.hasApiKey ? "已配置" : "未配置",
            content: (
              <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
                <div className="mb-5 flex items-center gap-2 text-base font-semibold text-ink-950">
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-5 w-5 text-signal-600"
                  />
                  接入参数
                </div>

                <form
                  action={saveAiConnectionSettingsAction}
                  className="space-y-5"
                >
                  <div className="grid gap-5 lg:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        API Key
                      </span>
                      <input
                        autoComplete="off"
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        name="apiKey"
                        placeholder={
                          settings.hasApiKey
                            ? "留空则保留当前 API Key"
                            : "输入 API Key"
                        }
                        type="password"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        模型名称
                      </span>
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

                  <div className="grid gap-5 lg:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        网络代理 URL（可选）
                      </span>
                      <input
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={networkProxySettings.proxyUrl}
                        name="networkProxyUrl"
                        placeholder="例如：http://127.0.0.1:1082"
                        type="url"
                      />
                      <span className="block text-xs leading-5 text-ink-700">
                        GUI 启动的桌面 App
                        不会继承终端代理；这里保存后，AI、图片、有声和发布请求都会走该代理。
                      </span>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        不走代理地址
                      </span>
                      <input
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={networkProxySettings.noProxy}
                        name="networkNoProxy"
                        placeholder="localhost,127.0.0.1,::1"
                        type="text"
                      />
                    </label>
                  </div>

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
                        勾选后保存会移除本机配置文件中的
                        key，模型名称和接口地址仍会保存。
                      </span>
                    </span>
                  </label>

                  <div className="flex flex-col gap-3 border-t border-ink-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm leading-6 text-ink-700">
                      <span className="font-semibold text-ink-950">
                        配置文件：
                      </span>
                      <span className="break-all">{settings.configPath}</span>
                    </div>
                    <FormActionButton
                      icon="save"
                      idleLabel="保存设置"
                      name="aiSettingsAction"
                      pendingLabel="保存中..."
                      statusText="正在保存模型接入参数。"
                      value="save"
                      variant="dark"
                    />
                  </div>
                </form>
              </section>
            ),
          },
          {
            id: "station-cat-publish",
            label: "网站发布",
            meta: stationCatSettings.hasToken ? "已配置" : "未配置",
            content: (
              <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
                <div className="mb-5 flex items-center gap-2 text-base font-semibold text-ink-950">
                  <Globe2
                    aria-hidden="true"
                    className="h-5 w-5 text-signal-600"
                  />
                  个人网站发布参数
                </div>

                <form
                  action={saveStationCatPublishSettingsAction}
                  className="space-y-5"
                >
                  <div className="grid gap-5 lg:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        Station Cat API Base URL
                      </span>
                      <input
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={stationCatSettings.apiBaseUrl}
                        name="stationCatApiBaseUrl"
                        placeholder="https://wwwstationcat.org"
                        type="url"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-800">
                        默认发布模式
                      </span>
                      <select
                        className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                        defaultValue={stationCatSettings.defaultMode}
                        name="stationCatDefaultMode"
                      >
                        {publishModeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-ink-800">
                      Station Cat Publish Token
                    </span>
                    <input
                      autoComplete="off"
                      className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                      name="stationCatToken"
                      placeholder={
                        stationCatSettings.hasToken
                          ? "留空则保留当前 Token"
                          : "输入与网站端 NOVELFORGE_PUBLISH_TOKEN 一致的 Token"
                      }
                      type="password"
                    />
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4 text-sm text-ink-700">
                    <input
                      className="mt-1 h-4 w-4 rounded border-ink-950/20 text-signal-600"
                      name="clearStationCatToken"
                      type="checkbox"
                    />
                    <span>
                      <span className="block font-semibold text-ink-950">
                        清除已保存的 Station Cat Publish Token
                      </span>
                      <span className="mt-1 block leading-6">
                        勾选后保存会移除本机配置文件中的发布 Token，API Base URL
                        和默认模式仍会保存。
                      </span>
                    </span>
                  </label>

                  <div className="flex flex-col gap-3 border-t border-ink-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm leading-6 text-ink-700">
                      <span className="font-semibold text-ink-950">
                        网站接口：
                      </span>
                      <span className="break-all">
                        {stationCatSettings.apiBaseUrl}/api/novelforge/import
                      </span>
                    </div>
                    <FormActionButton
                      icon="save"
                      idleLabel="保存网站发布设置"
                      name="stationCatSettingsAction"
                      pendingLabel="保存中..."
                      statusText="正在保存网站发布参数。"
                      value="save"
                      variant="dark"
                    />
                  </div>
                </form>
              </section>
            ),
          },
          {
            id: "local-data",
            hashAliases: ["app-version", "local-backups"],
            label: "数据与版本",
            meta: `v${appVersion}`,
            content: (
              <>
                <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
                  <div className="flex items-start gap-3">
                    <Database
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 text-signal-600"
                    />
                    <div>
                      <h2 className="text-base font-semibold text-ink-950">
                        本地保存状态
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-ink-700">
                        当前来源：{sourceLabel(settings.source)}；配置文件
                        {settings.fileExists ? "已存在" : "尚未创建"}。
                        有声导出来源：{sourceLabel(ttsSettings.source)}。
                        Station Cat 来源：
                        {sourceLabel(stationCatSettings.source)}。
                        网络代理来源：{sourceLabel(networkProxySettings.source)}
                        。
                      </p>
                    </div>
                  </div>
                </section>

                <section
                  className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
                  id="local-backups"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-base font-semibold text-ink-950">
                        <Database
                          aria-hidden="true"
                          className="h-5 w-5 text-signal-600"
                        />
                        本地数据备份
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
                        备份会打包本地 SQLite 数据库和生成资产目录，不包含 API
                        Key、发布 Token
                        或其他本机密钥。删除项目前建议先创建一次备份。
                      </p>
                      <p className="mt-2 break-all text-xs leading-5 text-ink-700">
                        备份目录：{localBackupRoot}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={createLocalBackupAction}>
                        <FormActionButton
                          icon="save"
                          idleLabel="创建本地备份"
                          pendingLabel="备份中..."
                          statusText="正在打包本地数据库和生成资产，请稍候。"
                          value="backup"
                          variant="dark"
                        />
                      </form>
                      <form action={openLocalBackupDirectoryAction}>
                        <FormActionButton
                          icon="folder"
                          idleLabel="打开备份目录"
                          pendingLabel="正在打开..."
                          statusText="正在打开本机备份目录。"
                          value="open-backup-dir"
                        />
                      </form>
                    </div>
                  </div>

                  {localBackups.length === 0 ? (
                    <p className="mt-4 rounded-md border border-dashed border-ink-950/15 bg-paper-50 px-3 py-3 text-sm text-ink-700">
                      还没有本地备份。创建后会在这里显示最近备份文件。
                    </p>
                  ) : (
                    <div className="mt-4 overflow-hidden rounded-lg border border-ink-950/10">
                      <div className="grid grid-cols-[1fr_120px_160px] bg-paper-50 px-3 py-2 text-xs font-semibold text-ink-800 max-sm:hidden">
                        <div>文件</div>
                        <div>大小</div>
                        <div>时间</div>
                      </div>
                      <div className="divide-y divide-ink-950/10">
                        {localBackups.slice(0, 5).map((backup) => (
                          <div
                            className="grid gap-1 px-3 py-3 text-sm sm:grid-cols-[1fr_120px_160px] sm:items-center"
                            key={backup.absolutePath}
                          >
                            <p className="break-all font-medium text-ink-950">
                              {backup.fileName}
                            </p>
                            <p className="text-ink-700">
                              {formatFileSize(backup.sizeBytes)}
                            </p>
                            <p className="text-ink-700">
                              {backup.updatedAt.toLocaleString("zh-CN")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section
                  className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
                  id="app-version"
                >
                  <div className="flex items-start gap-3">
                    <PackageCheck
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 text-signal-600"
                    />
                    <div>
                      <h2 className="text-base font-semibold text-ink-950">
                        版本与更新
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-ink-700">
                        当前版本：v{appVersion}。{appReleaseTitle}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-700">
                        {appReleaseNotes.map((note) => (
                          <li className="flex gap-2" key={note}>
                            <CheckCircle2
                              aria-hidden="true"
                              className="mt-1 h-4 w-4 shrink-0 text-signal-600"
                            />
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-3 shadow-panel">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {label}
      </div>
      <p className="mt-2 break-all text-base font-semibold leading-6 text-ink-950">
        {value}
      </p>
    </div>
  );
}

function AiTaskRouteFields({
  route,
  apiKeyName,
  baseUrlName,
  clearKeyName,
  modelName,
  allowDraftConnectionReuse = false,
  supportsGpt56Luna = false,
}: {
  route: AiTaskModelRouteSetting;
  apiKeyName: string;
  baseUrlName: string;
  clearKeyName: string;
  modelName: string;
  allowDraftConnectionReuse?: boolean;
  supportsGpt56Luna?: boolean;
}) {
  const routeStatus = route.isUsingSharedConnection
    ? `已复用草稿接入 · ${route.model}`
    : route.isActive
      ? `已启用 ${route.model}`
      : route.useDraftConnection
        ? `等待草稿 API Key · ${route.model}`
        : `未配置 Key，暂用默认模型`;
  const modelListId = `${modelName}-options`;

  return (
    <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-950">{route.label}</p>
          <p className="mt-1 text-xs leading-5 text-ink-700">{routeStatus}</p>
        </div>
        <span className="rounded-md border border-ink-950/10 bg-white px-2 py-1 text-xs font-semibold text-ink-700">
          {sourceLabel(route.source)}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {allowDraftConnectionReuse ? (
          <label className="flex items-start gap-3 rounded-md border border-signal-600/20 bg-signal-600/5 p-3 text-sm text-ink-700">
            <input
              className="mt-1 h-4 w-4 rounded border-ink-950/20 text-signal-600"
              defaultChecked={route.useDraftConnection}
              name="polishUseDraftConnection"
              type="checkbox"
            />
            <span>
              <span className="block font-semibold text-ink-950">
                复用章节草稿接入
              </span>
              <span className="mt-1 block leading-6">
                使用同一 API Key 和 Base URL；下方若填入独立 Key，会优先使用独立接入。
              </span>
            </span>
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink-800">
            {allowDraftConnectionReuse
              ? "独立 API Key（可选）"
              : "API Key"}
          </span>
          <input
            autoComplete="off"
            className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
            name={apiKeyName}
            placeholder={
              route.isUsingSharedConnection
                ? "留空则继续复用草稿 Key"
                : route.hasApiKey
                  ? "留空则保留当前 Key"
                  : "输入该路由的 API Key"
            }
            type="password"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink-800">模型</span>
          <input
            className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
            defaultValue={route.model}
            list={modelListId}
            name={modelName}
            placeholder={allowDraftConnectionReuse ? "kimi-k3" : "kimi-k2.6"}
            type="text"
          />
          <datalist id={modelListId}>
            <option value="kimi-k2.6" />
            <option value="kimi-k3" />
            {supportsGpt56Luna ? <option value={GPT_5_6_LUNA_MODEL} /> : null}
          </datalist>
          <span className="block text-xs leading-5 text-ink-600">
            {allowDraftConnectionReuse
              ? "K3 适合整章精修、视角与文风校正、短故事整篇审校。"
              : "K2.6 适合正文初稿与快速生成；GPT-5.6 Luna 使用 OpenAI API，固定为极高推理强度。选择 Luna 后，若仍保留 Moonshot 默认地址，保存时会自动切换到 OpenAI 地址。"}
          </span>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink-800">
            API Base URL
          </span>
          <input
            className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
            defaultValue={route.baseUrl}
            name={baseUrlName}
            placeholder={
              supportsGpt56Luna
                ? "https://api.moonshot.cn/v1 或 https://api.openai.com/v1"
                : "https://api.moonshot.cn/v1"
            }
            type="url"
          />
        </label>

        <label className="flex items-start gap-3 rounded-md border border-ink-950/10 bg-white p-3 text-sm text-ink-700">
          <input
            className="mt-1 h-4 w-4 rounded border-ink-950/20 text-signal-600"
            name={clearKeyName}
            type="checkbox"
          />
          <span>
            <span className="block font-semibold text-ink-950">
              清除已保存的 API Key
            </span>
            <span className="mt-1 block leading-6">
              {allowDraftConnectionReuse
                ? "勾选后会移除精修的独立 Key；若已开启复用，之后继续使用草稿 Key。"
                : "勾选后会移除此任务路由的 Key，模型和接口地址仍会保存。"}
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function routeStatusText(route: AiTaskModelRouteSetting) {
  if (!route.isActive) {
    return "默认模型";
  }

  return route.isUsingSharedConnection
    ? `${route.model}（复用草稿接入）`
    : route.model;
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

function formatFileSize(bytes?: string | number) {
  const value = typeof bytes === "string" ? Number(bytes) : bytes;

  if (!value || !Number.isFinite(value)) {
    return "未知";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatTtsEndpointPreview(settings: TtsGenerationSettings) {
  const baseUrl = settings.apiBaseUrl.replace(/\/+$/, "");

  if (settings.providerId === "glm_tts") {
    return `${baseUrl}/audio/speech`;
  }

  return `${baseUrl}/models/${settings.model}:generateContent`;
}

function settingsSavedMessage(
  saved?: string,
  detail: {
    backupError?: string;
    backupFile?: string;
    backupFiles?: string;
    backupSize?: string;
    ttsError?: string;
  } = {},
) {
  if (saved === "ai") {
    return {
      kind: "success",
      title: "AI 接入参数已保存",
      description: "新的模型、接口地址和 API Key 设置会用于后续模型调用。",
    };
  }

  if (saved === "ai-route") {
    return {
      kind: "success",
      title: "章节写作模型路由已保存",
      description: "章节草稿生成和正文精修会按任务路由使用已配置的模型。",
    };
  }

  if (saved === "ai-route-error") {
    return {
      kind: "error",
      title: "章节写作模型路由保存失败",
      description:
        "Kimi API Base URL 必须是有效的 http 或 https 地址，请检查后重新保存。",
    };
  }

  if (saved === "station-cat") {
    return {
      kind: "success",
      title: "个人网站发布参数已保存",
      description:
        "Station Cat 接口、发布 Token 和默认发布模式已写入本机配置。",
    };
  }

  if (saved === "tts") {
    return {
      kind: "success",
      title: "有声导出参数已保存",
      description:
        "新的 TTS 接口、模型、音色、语言和风格提示词会用于后续有声小说导出。",
    };
  }

  if (saved === "tts-voice") {
    return {
      kind: "success",
      title: "音色已保存",
      description:
        "当前 voice name 已写入本机有声导出设置，后续试听和章节导出会自动使用。",
    };
  }

  if (saved === "tts-preview") {
    return {
      kind: "success",
      title: "音色试听已生成",
      description: "下方播放器可以试听当前模型和音色的短音频。",
    };
  }

  if (saved === "tts-missing-key") {
    return {
      kind: "error",
      title: "音色试听失败",
      description: "请先填写或保存当前 TTS API Key，再试听音色。",
    };
  }

  if (saved === "tts-missing-voice") {
    return {
      kind: "error",
      title: "音色试听失败",
      description: "请先从音色列表选择一个音色，或手动填写 voice name。",
    };
  }

  if (saved === "tts-preview-error") {
    return {
      kind: "error",
      title: "音色试听失败",
      description: detail.ttsError
        ? `TTS 接口调用失败：${detail.ttsError}`
        : "TTS 接口没有返回可用音频，请检查 API Key、模型、音色 ID 和语言设置。",
    };
  }

  if (saved === "tts-error") {
    return {
      kind: "error",
      title: "有声导出参数保存失败",
      description:
        "TTS 供应商、接口地址、模型或输出格式无效，请检查后重新保存。",
    };
  }

  if (saved === "backup") {
    return {
      kind: "success",
      title: "本地备份已创建",
      description: `${detail.backupFile || "备份文件"} 已保存，包含 ${detail.backupFiles || "若干"} 个文件，大小 ${formatFileSize(detail.backupSize)}。`,
    };
  }

  if (saved === "backup-folder") {
    return {
      kind: "success",
      title: "已打开备份目录",
      description: "可以在 Finder 中查看、复制或转移本地备份文件。",
    };
  }

  if (saved === "backup-error" || saved === "backup-folder-error") {
    return {
      kind: "error",
      title: saved === "backup-error" ? "本地备份失败" : "打开备份目录失败",
      description:
        detail.backupError || "请检查本地磁盘权限和数据库路径后重试。",
    };
  }

  return null;
}

async function loadTtsVoicesForSettings({
  enabled,
  languageCode,
  modelId,
}: {
  enabled: boolean;
  languageCode: string;
  modelId: string;
}): Promise<
  | {
      kind: "idle";
      voices: [];
    }
  | {
      kind: "loaded";
      voices: TtsVoice[];
    }
  | {
      kind: "error";
      message: string;
      voices: [];
    }
> {
  if (!enabled) {
    return {
      kind: "idle",
      voices: [],
    };
  }

  try {
    const provider = getConfiguredTtsProvider();
    const voices = await provider.listVoices({
      languageCode,
      modelId,
    });

    return {
      kind: "loaded",
      voices,
    };
  } catch (error) {
    return {
      kind: "error",
      message: formatTtsVoiceLookupError(error),
      voices: [],
    };
  }
}

function formatTtsVoiceLookupError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message.trim() : "未知错误";
  const message = rawMessage
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer ***")
    .slice(0, 180);

  return `音色列表读取失败：${message}。你仍然可以手动填写 voice name。`;
}
