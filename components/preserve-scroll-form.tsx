"use client";

import type {
  FormHTMLAttributes,
  FormEvent,
  ReactNode,
} from "react";
import { useEffect, useState } from "react";
import {
  safeReadScroll,
  safeRemoveScroll,
  safeWriteScroll,
} from "./preserve-scroll-storage";

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
    const saved = safeReadScroll(getSessionStorage(), storageKey);

    if (!saved) {
      return;
    }

    safeRemoveScroll(getSessionStorage(), storageKey);

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
    safeWriteScroll(getSessionStorage(), storageKey, {
      left: window.scrollX,
      top: window.scrollY,
    });
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

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
