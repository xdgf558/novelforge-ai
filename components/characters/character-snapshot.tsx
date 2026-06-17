import {
  characterFieldGroups,
  characterStatusOptions,
  characterValuesFromRecord,
  type CharacterFieldName,
} from "@/lib/character-fields";

type CharacterSnapshotProps = {
  values: Partial<Record<CharacterFieldName, string | null>>;
};

export function CharacterSnapshot({ values }: CharacterSnapshotProps) {
  const normalizedValues = characterValuesFromRecord(values);
  const statusLabel =
    characterStatusOptions.find(
      (option) => option.value === normalizedValues.status,
    )?.label ?? "活跃";

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div>
          <h2 className="text-base font-semibold text-ink-950">角色基础</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            姓名和状态是角色库检索与后续上下文组装的基础。
          </p>
        </div>

        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          <SnapshotItem label="角色姓名" value={normalizedValues.name} />
          <SnapshotItem label="角色状态" value={statusLabel} />
        </dl>
      </section>

      {characterFieldGroups.map((group) => (
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
