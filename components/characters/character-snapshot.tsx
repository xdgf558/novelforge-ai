import {
  characterFieldGroups,
  characterStatusLabel,
  characterValuesFromRecord,
  type CharacterFieldName,
} from "@/lib/character-fields";

type CharacterSnapshotProps = {
  values: Partial<Record<CharacterFieldName, string | null>>;
};

export function CharacterSnapshot({ values }: CharacterSnapshotProps) {
  const normalizedValues = characterValuesFromRecord(values);
  const statusLabel = characterStatusLabel(normalizedValues.status);

  return (
    <div className="space-y-3">
      <section className="nf-section-panel">
        <div>
          <h2 className="text-base font-semibold text-ink-950">角色基础</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            姓名和状态是角色库检索与后续上下文组装的基础。
          </p>
        </div>

        <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-ink-950/10 bg-ink-950/10 md:grid-cols-2">
          <SnapshotItem label="角色姓名" value={normalizedValues.name} />
          <SnapshotItem label="角色状态" value={statusLabel} />
        </dl>
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
              {
                group.fields.filter((field) =>
                  normalizedValues[field.name].trim(),
                ).length
              }
              /{group.fields.length} 已填写
            </span>
          </summary>

          <div className="nf-collapsible-snapshot-body">
            <dl className="grid gap-3 lg:grid-cols-2">
              {group.fields.map((field) => (
                <SnapshotItem
                  bounded
                  key={field.name}
                  label={field.label}
                  value={normalizedValues[field.name]}
                />
              ))}
            </dl>
          </div>
        </details>
      ))}
    </div>
  );
}

function SnapshotItem({
  bounded = false,
  label,
  value,
}: {
  bounded?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 bg-paper-50 p-3">
      <dt className="text-sm font-medium text-ink-800">{label}</dt>
      <dd
        className={`mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-700 ${
          bounded ? "max-h-72 overflow-auto pr-1" : ""
        }`}
      >
        {value || "未填写"}
      </dd>
    </div>
  );
}
