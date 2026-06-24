"use client";

import type {
  FormHTMLAttributes,
  FormEvent,
  ReactNode,
} from "react";
import { useEffect, useState } from "react";
import {
  restorePreservedScroll,
  submitPreserveScrollForm,
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
    restorePreservedScroll({
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
      scrollTo: window.scrollTo.bind(window),
      storage: getSessionStorage(),
      storageKey,
    });
  }, [storageKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    submitPreserveScrollForm({
      event,
      onSubmit,
      position: {
        left: window.scrollX,
        top: window.scrollY,
      },
      setSubmitted,
      storage: getSessionStorage(),
      storageKey,
    });
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
