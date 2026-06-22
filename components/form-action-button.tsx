"use client";

import {
  FolderOpen,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Volume2,
} from "lucide-react";
import { useFormStatus } from "react-dom";

type FormActionButtonIcon = "folder" | "play" | "refresh" | "save" | "volume";
type FormActionButtonVariant = "dark" | "outline";

type FormActionButtonProps = {
  disabled?: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
  icon: FormActionButtonIcon;
  idleLabel: string;
  name?: string;
  pendingLabel: string;
  statusText?: string;
  value?: string;
  variant?: FormActionButtonVariant;
};

const iconMap = {
  folder: FolderOpen,
  play: Play,
  refresh: RefreshCw,
  save: Save,
  volume: Volume2,
} satisfies Record<FormActionButtonIcon, typeof Play>;

export function FormActionButton({
  disabled = false,
  formAction,
  icon,
  idleLabel,
  name,
  pendingLabel,
  statusText,
  value,
  variant = "outline",
}: FormActionButtonProps) {
  const { data, pending } = useFormStatus();
  const isOwnSubmission =
    pending && (!name || !value || data?.get(name)?.toString() === value);
  const isDisabled = disabled || pending;
  const IdleIcon = iconMap[icon];
  const Icon = isOwnSubmission ? Loader2 : IdleIcon;

  return (
    <div className="space-y-2">
      <button
        aria-busy={isOwnSubmission}
        className={buttonClassName({
          isDisabled,
          isPending: isOwnSubmission,
          variant,
        })}
        disabled={isDisabled}
        formAction={formAction}
        name={name}
        type="submit"
        value={value}
      >
        <Icon
          aria-hidden="true"
          className={`h-4 w-4 ${isOwnSubmission ? "animate-spin" : ""}`}
        />
        {isOwnSubmission ? pendingLabel : idleLabel}
      </button>
      {isOwnSubmission && statusText ? (
        <p className="text-xs leading-5 text-ink-700" role="status">
          {statusText}
        </p>
      ) : null}
    </div>
  );
}

function buttonClassName({
  isDisabled,
  isPending,
  variant,
}: {
  isDisabled: boolean;
  isPending: boolean;
  variant: FormActionButtonVariant;
}) {
  const base =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-60";
  const disabledClass = isPending ? "cursor-wait" : "cursor-not-allowed";

  if (variant === "dark") {
    return `${base} ${
      isDisabled
        ? `${disabledClass} bg-ink-800 text-white`
        : "bg-ink-950 text-white hover:bg-ink-800"
    }`;
  }

  return `${base} border border-ink-950/15 ${
    isDisabled
      ? `${disabledClass} bg-paper-50 text-ink-700`
      : "bg-white text-ink-800 hover:bg-paper-100"
  }`;
}
