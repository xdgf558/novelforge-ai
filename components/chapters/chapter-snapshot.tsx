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
    <div className="space-y-3">
      <section className="nf-section-panel">
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

        <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-ink-950/10 bg-ink-950/10 md:grid-cols-2 xl:grid-cols-4">
          <SnapshotItem
            compact
            label={shortStoryProject ? "单元序号" : "章节号"}
            value={
              shortStoryProject
                ? `单元 ${formatNumber(normalizedValues.chapterNumber)}`
                : `第 ${formatNumber(normalizedValues.chapterNumber)} 章`
            }
          />
          <SnapshotItem
            compact
            label={shortStoryProject ? "单元标题" : "章节标题"}
            value={normalizedValues.title}
          />
          <SnapshotItem
            compact
            label={shortStoryProject ? "单元状态" : "章节状态"}
            value={statusLabel}
          />
          <SnapshotItem
            compact
            label="当前字数"
            value={formatChapterWordCount(normalizedValues.wordCount)}
          />
        </dl>
      </section>

      {shortStoryProject ? (
        <details className="nf-collapsible-snapshot">
          <summary>
            <span>
              <strong>单元规划</strong>
              <small>场景、冲突、转折与蓝图兑现</small>
            </span>
            <span className="nf-collapsible-snapshot-meta">
              {filledFieldCount(
                shortStoryUnitPlanFields.map(
                  (field) => normalizedValues[field.name],
                ),
              )}
              /{shortStoryUnitPlanFields.length} 已填写
            </span>
          </summary>
          <div className="nf-collapsible-snapshot-body">
            <dl className="grid gap-3 lg:grid-cols-2">
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
          </div>
        </details>
      ) : null}

      {chapterFieldGroups.map((group) => {
        const title =
          shortStoryProject && group.title === "章节目标"
            ? "单元目标与节拍"
            : group.title;
        const filledCount = filledFieldCount(
          group.fields.map((field) => normalizedValues[field.name]),
        );

        return (
          <details
            className="nf-collapsible-snapshot"
            key={group.id}
            open={group.id === "content"}
          >
            <summary>
              <span>
                <strong>{title}</strong>
                <small>
                  {shortStoryProject && group.title === "章节目标"
                    ? "目标与作者确认节拍"
                    : shortStoryProject && group.title === "作者备注"
                      ? "临时提醒与后续兑现"
                      : group.description}
                </small>
              </span>
              <span className="nf-collapsible-snapshot-meta">
                {filledCount}/{group.fields.length} 已填写
              </span>
            </summary>
            <div className="nf-collapsible-snapshot-body">
              <dl className="grid gap-3 lg:grid-cols-2">
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
            </div>
          </details>
        );
      })}
    </div>
  );
}

function filledFieldCount(values: readonly string[]) {
  return values.filter((value) => value.trim()).length;
}

function SnapshotItem({
  compact = false,
  label,
  value,
}: {
  compact?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        compact
          ? "bg-white px-4 py-3"
          : "min-w-0 rounded-md border border-ink-950/10 bg-paper-50 p-3"
      }
    >
      <dt className="text-sm font-medium text-ink-800">{label}</dt>
      <dd
        className={`mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-700 ${
          compact ? "" : "max-h-72 overflow-auto pr-1"
        }`}
      >
        {value || "未填写"}
      </dd>
    </div>
  );
}
