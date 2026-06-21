"use client";

import { useFormStatus } from "react-dom";

type OutlineSaveButtonProps = {
  label: string;
};

export function OutlineSaveButton({ label }: OutlineSaveButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-4 inline-flex min-h-10 items-center rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-wait disabled:bg-ink-700"
      disabled={pending}
      type="submit"
    >
      {pending ? "保存中..." : `保存${label}`}
    </button>
  );
}
