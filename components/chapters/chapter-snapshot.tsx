import {
  chapterFieldGroups,
  chapterStatusLabel,
  chapterValuesFromRecord,
  formatChapterWordCount,
  shortStoryUnitPlanFields,
  type ChapterRecord,
} from "@/lib/chapter-fields";
import { formatNumber } from "@/lib/format";
import { isShortStoryProject } from "@/lib/projects/work-types";

type ChapterSnapshotProps = {
  values?: ChapterRecord | null;
  workType?: string | null;
};

export function ChapterSnapshot({ values, workType }: ChapterSnapshotProps) {
  const normalizedValues = chapterValuesFromRecord(values);
  const statusLabel = chapterStatusLabel(normalizedValues.status);
  const shortStoryProject = isShortStoryProject(workType);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div>
          <h2 className="text-base font-semibold text-ink-950">
            {shortStoryProject ? "写作单元基础" : "章节基础"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            {shortStoryProject
              ? "单元序号、标题、状态和字数是整篇组装与后续上下文选择的基础。"
              : "章节号、标题、状态和字数是章节检索与后续上下文组装的基础。"}
          </p>
        </div>

        <dl className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SnapshotItem
            label={shortStoryProject ? "单元序号" : "章节号"}
            value={
              shortStoryProject
                ? `单元 ${formatNumber(normalizedValues.chapterNumber)}`
                : `第 ${formatNumber(normalizedValues.chapterNumber)} 章`
            }
          />
          <SnapshotItem
            label={shortStoryProject ? "单元标题" : "章节标题"}
            value={normalizedValues.title}
          />
          <SnapshotItem
            label={shortStoryProject ? "单元状态" : "章节状态"}
            value={statusLabel}
          />
          <SnapshotItem
            label="当前字数"
            value={formatChapterWordCount(normalizedValues.wordCount)}
          />
        </dl>
      </section>

      {shortStoryProject ? (
        <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
          <div>
            <h2 className="text-base font-semibold text-ink-950">单元规划</h2>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              这些确认内容会与正式蓝图一起约束单元节拍、草稿和精修。
            </p>
          </div>
          <dl className="mt-5 grid gap-4 lg:grid-cols-2">
            <SnapshotItem
              label="目标字数"
              value={
                normalizedValues.unitWordTarget > 0
                  ? `${formatNumber(normalizedValues.unitWordTarget)} 字`
                  : ""
              }
            />
            {shortStoryUnitPlanFields.map((field) => (
              <SnapshotItem
                key={field.name}
                label={field.label}
                value={normalizedValues[field.name]}
              />
            ))}
          </dl>
        </section>
      ) : null}

      {chapterFieldGroups.map((group) => (
        <section
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
          key={group.title}
        >
          <div>
            <h2 className="text-base font-semibold text-ink-950">
              {shortStoryProject && group.title === "章节目标"
                ? "单元目标与节拍"
                : group.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              {shortStoryProject && group.title === "章节目标"
                ? "记录这个内部写作单元要完成的剧情功能，以及作者确认的细化节拍。"
                : shortStoryProject && group.title === "作者备注"
                  ? "保存这个写作单元的临时提醒、修订计划和后续兑现注意事项。"
                  : group.description}
            </p>
          </div>

          <dl className="mt-5 grid gap-4 lg:grid-cols-2">
            {group.fields.map((field) => (
              <SnapshotItem
                key={field.name}
                label={
                  shortStoryProject && field.name === "goal"
                    ? "单元目标"
                    : shortStoryProject && field.name === "beats"
                      ? "单元节拍"
                      : field.label
                }
                value={normalizedValues[field.name]}
              />
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-paper-50 p-4">
      <dt className="text-sm font-medium text-ink-800">{label}</dt>
      <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">
        {value || "未填写"}
      </dd>
    </div>
  );
}
