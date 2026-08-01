"use client";

import {
  Archive,
  FolderOpen,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Trash2,
  Volume2,
} from "lucide-react";
import { useFormStatus } from "react-dom";

type FormActionButtonIcon =
  | "archive"
  | "folder"
  | "play"
  | "refresh"
  | "save"
  | "trash"
  | "volume";
type FormActionButtonVariant = "danger" | "dark" | "outline" | "primary";

type FormActionButtonProps = {
  className?: string;
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
  archive: Archive,
  folder: FolderOpen,
  play: Play,
  refresh: RefreshCw,
  save: Save,
  trash: Trash2,
  volume: Volume2,
} satisfies Record<FormActionButtonIcon, typeof Play>;

export function FormActionButton({
  className,
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
        className={`${buttonClassName({
          isDisabled,
          isPending: isOwnSubmission,
          variant,
        })}${className ? ` ${className}` : ""}`}
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

  if (variant === "danger") {
    return `${base} border border-red-500/25 ${
      isDisabled
        ? `${disabledClass} bg-red-50 text-red-700`
        : "bg-red-50 text-red-700 hover:bg-red-100"
    }`;
  }

  if (variant === "primary") {
    return `${base} border border-[rgba(241,168,76,0.38)] ${
      isDisabled
        ? `${disabledClass} bg-[rgba(241,168,76,0.09)] text-[var(--nf-amber-light)]`
        : "bg-[rgba(241,168,76,0.16)] text-[var(--nf-amber-light)] hover:bg-[rgba(241,168,76,0.24)]"
    }`;
  }

  return `${base} border border-ink-950/15 ${
    isDisabled
      ? `${disabledClass} bg-paper-50 text-ink-700`
      : "bg-white text-ink-800 hover:bg-paper-100"
  }`;
}
