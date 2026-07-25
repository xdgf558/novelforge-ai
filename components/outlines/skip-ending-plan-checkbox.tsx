export function SkipEndingPlanCheckbox() {
  return (
    <label className="flex min-h-10 items-center gap-2 text-xs font-medium text-ink-700">
      <input
        className="h-4 w-4 rounded border-ink-950/20 text-signal-600"
        name="skipEndingPlan"
        type="checkbox"
      />
      本次不引用终局规划
    </label>
  );
}
