import {
  shortStoryBlueprintGroups,
  shortStoryBlueprintValuesFromRecord,
  type ShortStoryBlueprintFieldName,
} from "@/lib/short-stories/blueprint-fields";

export function ShortStoryBlueprintSnapshot({
  values,
  emptyText = "未填写",
}: {
  values?: Partial<Record<ShortStoryBlueprintFieldName, unknown>> | null;
  emptyText?: string;
}) {
  const normalized = shortStoryBlueprintValuesFromRecord(values);

  return (
    <div className="space-y-6">
      {shortStoryBlueprintGroups.map((group) => (
        <section className="border-t border-ink-950/10 pt-4" key={group.title}>
          <h2 className="text-base font-semibold text-ink-950">{group.title}</h2>
          <p className="mt-1 text-xs leading-5 text-ink-700">
            {group.description}
          </p>
          <dl className="mt-4 grid gap-4 lg:grid-cols-2">
            {group.fields.map((field) => (
              <div key={field.name}>
                <dt className="text-xs font-semibold text-ink-700">
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-900">
                  {normalized[field.name] || emptyText}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
