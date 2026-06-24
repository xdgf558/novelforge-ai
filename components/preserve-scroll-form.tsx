"use client";

import type {
  FormHTMLAttributes,
  FormEvent,
  ReactNode,
} from "react";
import { useEffect, useState } from "react";

type PreserveScrollFormProps = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "children" | "onSubmit"
> & {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  preserveKey: string;
  statusText?: string;
};

const storagePrefix = "novelforge:form-scroll:";

export function PreserveScrollForm({
  children,
  onSubmit,
  preserveKey,
  statusText = "已提交，任务正在后台处理。",
  ...props
}: PreserveScrollFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const storageKey = `${storagePrefix}${preserveKey}`;

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);

    if (!saved) {
      return;
    }

    window.sessionStorage.removeItem(storageKey);

    try {
      const position = JSON.parse(saved) as {
        left?: number;
        top?: number;
      };

      window.requestAnimationFrame(() => {
        window.scrollTo(position.left ?? 0, position.top ?? 0);
      });
    } catch {
      // If the saved value is invalid, ignore it rather than blocking the form.
    }
  }, [storageKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        left: window.scrollX,
        top: window.scrollY,
      }),
    );
    setSubmitted(true);
    onSubmit?.(event);
  }

  return (
    <form {...props} onSubmit={handleSubmit}>
      {children}
      {submitted ? (
        <p className="mt-2 text-xs leading-5 text-ink-700" role="status">
          {statusText}
        </p>
      ) : null}
    </form>
  );
}
