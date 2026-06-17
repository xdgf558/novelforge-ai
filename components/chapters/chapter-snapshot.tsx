import {
  chapterFieldGroups,
  chapterStatusLabel,
  chapterValuesFromRecord,
  type ChapterRecord,
} from "@/lib/chapter-fields";
import { formatNumber } from "@/lib/format";

type ChapterSnapshotProps = {
  values?: ChapterRecord | null;
};

export function ChapterSnapshot({ values }: ChapterSnapshotProps) {
  const normalizedValues = chapterValuesFromRecord(values);
  const statusLabel = chapterStatusLabel(normalizedValues.status);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div>
          <h2 className="text-base font-semibold text-ink-950">章节基础</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            章节号、标题、状态和字数是章节检索与后续上下文组装的基础。
          </p>
        </div>

        <dl className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SnapshotItem
            label="章节号"
            value={`第 ${formatNumber(normalizedValues.chapterNumber)} 章`}
          />
          <SnapshotItem label="章节标题" value={normalizedValues.title} />
          <SnapshotItem label="章节状态" value={statusLabel} />
          <SnapshotItem
            label="当前字数"
            value={formatNumber(normalizedValues.wordCount)}
          />
        </dl>
      </section>

      {chapterFieldGroups.map((group) => (
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

          <dl className="mt-5 grid gap-4 lg:grid-cols-2">
            {group.fields.map((field) => (
              <SnapshotItem
                key={field.name}
                label={field.label}
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
