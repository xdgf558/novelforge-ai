import {
  emptyProjectSettingValues,
  projectSettingGroupsForWorkType,
  type ProjectSettingFieldName,
} from "@/lib/project-setting-fields";

type SettingSnapshotProps = {
  values: Partial<Record<ProjectSettingFieldName, string>>;
  workType?: string | null;
};

export function SettingSnapshot({ values, workType }: SettingSnapshotProps) {
  const normalizedValues = emptyProjectSettingValues();
  const settingGroups = projectSettingGroupsForWorkType(workType);

  for (const field of settingGroups.flatMap((group) => group.fields)) {
    normalizedValues[field.name] = values[field.name] ?? "";
  }

  return (
    <div className="space-y-3">
      {settingGroups.map((group, index) => {
        const filledCount = group.fields.filter((field) =>
          normalizedValues[field.name].trim(),
        ).length;

        return (
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
                {filledCount}/{group.fields.length} 已填写
              </span>
            </summary>
            <div className="nf-collapsible-snapshot-body">
              <dl className="grid gap-3 lg:grid-cols-2">
                {group.fields.map((field) => {
                  const value = normalizedValues[field.name];

                  return (
                    <div
                      className="min-w-0 rounded-md border border-ink-950/10 bg-paper-50 p-3"
                      key={field.name}
                    >
                      <dt className="text-sm font-medium text-ink-800">
                        {field.label}
                      </dt>
                      <dd className="mt-1.5 max-h-72 overflow-auto whitespace-pre-wrap pr-1 text-sm leading-6 text-ink-700">
                        {value || "未填写"}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </details>
        );
      })}
    </div>
  );
}
