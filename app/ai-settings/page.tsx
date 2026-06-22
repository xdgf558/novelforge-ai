import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Database,
  Globe2,
  Headphones,
  Image as ImageIcon,
  KeyRound,
  PackageCheck,
  RefreshCw,
  Save,
  ServerCog,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
  UploadCloud,
  Volume2,
} from "lucide-react";
import {
  previewTtsVoiceAction,
  saveAiConnectionSettingsAction,
  saveImageGenerationSettingsAction,
  saveStationCatPublishSettingsAction,
  saveTtsGenerationSettingsAction,
} from "@/app/ai-settings/actions";
import {
  readAiConnectionSettings,
  readImageGenerationSettings,
  readStationCatPublishSettings,
  readTtsGenerationSettings,
} from "@/lib/ai/local-config";
import { appReleaseNotes, appReleaseTitle, appVersion } from "@/lib/app-version";
import {
  getConfiguredTtsProvider,
  ppqTtsModelOptions,
  ttsProviderOptions,
} from "@/lib/audio/providers/registry";
import type { TtsVoice } from "@/lib/audio/providers/types";
import { publishModeLabel, publishModeOptions } from "@/lib/publish-platforms";

export const dynamic = "force-dynamic";

type AiSettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    ttsLanguage?: string;
    ttsModel?: string;
    ttsPreviewPath?: string;
    ttsVoices?: string;
  }>;
};

export default async function AiSettingsPage({
  searchParams,
}: AiSettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const settings = readAiConnectionSettings();
  const imageSettings = readImageGenerationSettings();
  const ttsSettings = readTtsGenerationSettings();
  const stationCatSettings = readStationCatPublishSettings();
  const savedMessage = settingsSavedMessage(resolvedSearchParams?.saved);
  const ttsVoiceLookup = await loadTtsVoicesForSettings({
    enabled: resolvedSearchParams?.ttsVoices === "1",
    languageCode: resolvedSearchParams?.ttsLanguage || ttsSettings.languageCode,
    modelId: resolvedSearchParams?.ttsModel || ttsSettings.model,
  });
  const ttsPreviewPath = resolvedSearchParams?.ttsPreviewPath;

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
            本机接入设置
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
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

      <section className="grid gap-4 md:grid-cols-3">
        <InfoTile
          icon={KeyRound}
          label="AI API Key"
          value={settings.hasApiKey ? settings.maskedApiKey : "未配置"}
        />
        <InfoTile icon={Bot} label="模型" value={settings.model} />
        <InfoTile
          icon={ServerCog}
          label="接口地址"
          value={settings.baseUrl}
        />
        <InfoTile
          icon={ImageIcon}
          label="图片模型"
          value={imageSettings.model}
        />
        <InfoTile
          icon={KeyRound}
          label="图片 API Key"
          value={
            imageSettings.hasApiKey ? imageSettings.maskedApiKey : "未配置"
          }
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
          value={stationCatSettings.hasToken ? stationCatSettings.maskedToken : "未配置"}
        />
        <InfoTile
          icon={ShieldCheck}
          label="默认发布模式"
          value={publishModeLabel(stationCatSettings.defaultMode)}
        />
        <InfoTile icon={PackageCheck} label="当前版本" value={`v${appVersion}`} />
      </section>

      <section
        className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
        id="tts-settings"
      >
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-ink-950">
              <Headphones aria-hidden="true" className="h-5 w-5 text-signal-600" />
              有声小说导出参数
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
              第一版使用 PPQ TTS，支持 ElevenLabs 和 DeepGram 模型。音频导出只读取章节文本并生成本地音频文件，不会修改正式故事记忆。
            </p>
          </div>
          <form action="/ai-settings#tts-settings" className="flex flex-wrap gap-2" method="get">
            <input name="ttsVoices" type="hidden" value="1" />
            <select
              className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={resolvedSearchParams?.ttsModel || ttsSettings.model}
              name="ttsModel"
            >
              {ppqTtsModelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="min-h-10 w-24 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              defaultValue={resolvedSearchParams?.ttsLanguage || ttsSettings.languageCode}
              name="ttsLanguage"
              placeholder="zh"
              type="text"
            />
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              type="submit"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              刷新音色列表
            </button>
          </form>
        </div>

        <form action={saveTtsGenerationSettingsAction} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">TTS 供应商</span>
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
                placeholder="https://api.ppq.ai/v1"
                type="url"
              />
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">TTS 模型</span>
              <select
                className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                defaultValue={resolvedSearchParams?.ttsModel || ttsSettings.model}
                name="ttsModel"
              >
                {ppqTtsModelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">语言</span>
              <input
                className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                defaultValue={resolvedSearchParams?.ttsLanguage || ttsSettings.languageCode}
                name="ttsLanguageCode"
                placeholder="zh"
                type="text"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink-800">TTS API Key</span>
            <input
              autoComplete="off"
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              name="ttsApiKey"
              placeholder={
                ttsSettings.hasApiKey
                  ? "留空则保留当前 TTS API Key"
                  : "输入 PPQ API Key"
              }
              type="password"
            />
          </label>

          <div className="space-y-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-950">音色</p>
                <p className="text-xs leading-5 text-ink-700">
                  可以从刷新后的列表选择，也可以在高级输入里手填 ElevenLabs / DeepGram voice ID。
                </p>
              </div>
              <span className="text-xs text-ink-700">
                当前：{ttsSettings.voiceName || ttsSettings.voiceId || "未设置"}
              </span>
            </div>

            {ttsVoiceLookup.kind === "loaded" && ttsVoiceLookup.voices.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {ttsVoiceLookup.voices.slice(0, 24).map((voice) => (
                  <label
                    className="flex cursor-pointer gap-3 rounded-md border border-ink-950/10 bg-white p-3 text-sm transition hover:border-signal-600/40"
                    key={voice.id}
                  >
                    <input
                      className="mt-1 h-4 w-4 border-ink-950/20 text-signal-600"
                      defaultChecked={voice.id === ttsSettings.voiceId}
                      name="ttsVoiceSelection"
                      type="radio"
                      value={`${voice.id}|||${voice.name}`}
                    />
                    <span>
                      <span className="block font-semibold text-ink-950">
                        {voice.name}
                      </span>
                      <span className="mt-1 block break-all text-xs leading-5 text-ink-700">
                        {voice.id}
                        {voice.languageCode ? ` / ${voice.languageCode}` : ""}
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
                  : "点击“刷新音色列表”后，可以在这里选择 PPQ 返回的可用音色。"}
              </p>
            )}

            <input name="ttsVoiceName" type="hidden" value={ttsSettings.voiceName} />
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-ink-700">
                手填 voice ID
              </span>
              <input
                className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                defaultValue={ttsSettings.voiceId}
                name="ttsVoiceId"
                placeholder="例如：JBFqnCBsd6RMkjVDRZzb"
                type="text"
              />
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">输出格式</span>
              <select
                className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                defaultValue={ttsSettings.outputFormat}
                name="ttsOutputFormat"
              >
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="ogg">OGG</option>
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
              <p className="text-sm font-semibold text-ink-950">试听结果</p>
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
                勾选后保存会移除本机 TTS key，模型、接口、音色和风格提示词仍会保存。
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 border-t border-ink-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-ink-700">
              <span className="font-semibold text-ink-950">TTS 接口：</span>
              <span className="break-all">
                {ttsSettings.apiBaseUrl}/audio/speech
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-ink-950/15 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                formAction={previewTtsVoiceAction}
                type="submit"
              >
                <Volume2 aria-hidden="true" className="h-4 w-4" />
                试听音色
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
                type="submit"
              >
                <Save aria-hidden="true" className="h-4 w-4" />
                保存有声导出设置
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="mb-5 flex items-center gap-2 text-base font-semibold text-ink-950">
          <ImageIcon aria-hidden="true" className="h-5 w-5 text-signal-600" />
          封面图片生成参数
        </div>

        <form action={saveImageGenerationSettingsAction} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">
                图片 API Base URL
              </span>
              <input
                className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                defaultValue={imageSettings.apiBaseUrl}
                name="imageApiBaseUrl"
                placeholder="https://api.ppq.ai/v1"
                type="url"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">
                图片模型
              </span>
              <input
                className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                defaultValue={imageSettings.model}
                name="imageModel"
                placeholder="qwen-image-2"
                type="text"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink-800">
              图片 API Key
            </span>
            <input
              autoComplete="off"
              className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
              name="imageApiKey"
              placeholder={
                imageSettings.hasApiKey
                  ? "留空则保留当前图片 API Key"
                  : "输入 PPQ 或兼容图片接口的 API Key"
              }
              type="password"
            />
          </label>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">
                图片尺寸
              </span>
              <input
                className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                defaultValue={imageSettings.size}
                name="imageSize"
                placeholder="default / 1024x1536"
                type="text"
              />
              <span className="block text-xs leading-5 text-ink-700">
                填 default 时，作品封面会按用途自动使用建议尺寸。
              </span>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink-800">
                图片质量
              </span>
              <input
                className="min-h-11 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-600 focus:ring-2 focus:ring-signal-600/20"
                defaultValue={imageSettings.quality}
                name="imageQuality"
                placeholder="default / standard / high"
                type="text"
              />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4 text-sm text-ink-700">
            <input
              className="mt-1 h-4 w-4 rounded border-ink-950/20 text-signal-600"
              name="clearImageApiKey"
              type="checkbox"
            />
            <span>
              <span className="block font-semibold text-ink-950">
                清除已保存的图片 API Key
              </span>
              <span className="mt-1 block leading-6">
                勾选后保存会移除本机配置文件中的图片 key，模型、接口地址、尺寸和质量仍会保存。
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 border-t border-ink-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-ink-700">
              <span className="font-semibold text-ink-950">图片接口：</span>
              <span className="break-all">
                {imageSettings.apiBaseUrl}/images/generations
              </span>
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
              type="submit"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              保存图片生成设置
            </button>
          </div>
        </form>
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
        <div className="mb-5 flex items-center gap-2 text-base font-semibold text-ink-950">
          <Globe2 aria-hidden="true" className="h-5 w-5 text-signal-600" />
          个人网站发布参数
        </div>

        <form action={saveStationCatPublishSettingsAction} className="space-y-5">
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
                勾选后保存会移除本机配置文件中的发布 Token，API Base URL 和默认模式仍会保存。
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 border-t border-ink-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-ink-700">
              <span className="font-semibold text-ink-950">网站接口：</span>
              <span className="break-all">
                {stationCatSettings.apiBaseUrl}/api/novelforge/import
              </span>
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
              type="submit"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              保存网站发布设置
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
              图片生成来源：{sourceLabel(imageSettings.source)}。
              有声导出来源：{sourceLabel(ttsSettings.source)}。
              Station Cat 来源：{sourceLabel(stationCatSettings.source)}。
            </p>
          </div>
        </div>
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

function settingsSavedMessage(saved?: string) {
  if (saved === "ai") {
    return {
      kind: "success",
      title: "AI 接入参数已保存",
      description: "新的模型、接口地址和 API Key 设置会用于后续模型调用。",
    };
  }

  if (saved === "station-cat") {
    return {
      kind: "success",
      title: "个人网站发布参数已保存",
      description: "Station Cat 接口、发布 Token 和默认发布模式已写入本机配置。",
    };
  }

  if (saved === "image") {
    return {
      kind: "success",
      title: "图片生成参数已保存",
      description: "新的图片模型、接口地址、尺寸、质量和 API Key 设置会用于后续封面图生成。",
    };
  }

  if (saved === "image-error") {
    return {
      kind: "error",
      title: "图片生成参数保存失败",
      description: "图片 API Base URL 必须是有效的 http 或 https 地址，请检查后重新保存。",
    };
  }

  if (saved === "tts") {
    return {
      kind: "success",
      title: "有声导出参数已保存",
      description: "新的 TTS 接口、模型、音色、语言和风格提示词会用于后续有声小说导出。",
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
      description: "请先填写或保存 PPQ TTS API Key，再试听音色。",
    };
  }

  if (saved === "tts-preview-error") {
    return {
      kind: "error",
      title: "音色试听失败",
      description: "TTS 接口没有返回可用音频，请检查 API Key、模型、音色 ID 和语言设置。",
    };
  }

  if (saved === "tts-error") {
    return {
      kind: "error",
      title: "有声导出参数保存失败",
      description: "TTS 供应商、接口地址、模型或输出格式无效，请检查后重新保存。",
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
  } catch {
    return {
      kind: "error",
      message:
        "音色列表读取失败。请确认已保存 PPQ API Key，或稍后重试；你仍然可以手动填写 voice ID。",
      voices: [],
    };
  }
}
