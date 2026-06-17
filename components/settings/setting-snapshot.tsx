import {
  emptyProjectSettingValues,
  projectSettingGroups,
  type ProjectSettingFieldName,
  type ProjectSettingValues,
} from "@/lib/project-setting-fields";

type SettingSnapshotProps = {
  values: Partial<Record<ProjectSettingFieldName, string>>;
};

export function SettingSnapshot({ values }: SettingSnapshotProps) {
  const normalizedValues = emptyProjectSettingValues();

  for (const field of projectSettingGroups.flatMap((group) => group.fields)) {
    normalizedValues[field.name] = values[field.name] ?? "";
  }

  return (
    <div className="space-y-5">
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

          <dl className="mt-5 grid gap-4 lg:grid-cols-2">
            {group.fields.map((field) => {
              const value = normalizedValues[field.name];

              return (
                <div className="rounded-md bg-paper-50 p-4" key={field.name}>
                  <dt className="text-sm font-medium text-ink-800">
                    {field.label}
                  </dt>
                  <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">
                    {value || "未填写"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}
