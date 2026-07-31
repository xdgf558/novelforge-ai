"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  resolveWorkspaceTabId,
  type WorkspaceTabTarget,
} from "@/lib/workspace-tab-navigation";

export type WorkspaceTab = {
  id: string;
  label: string;
  meta?: string;
  hashAliases?: readonly string[];
  content: ReactNode;
};

type WorkspaceTabsProps = {
  ariaLabel: string;
  initialTabId?: string;
  tabs: readonly WorkspaceTab[];
};

export function WorkspaceTabs({
  ariaLabel,
  initialTabId,
  tabs,
}: WorkspaceTabsProps) {
  const fallbackId = initialTabId ?? tabs[0]?.id ?? "";
  const tabTargetSignature = JSON.stringify(
    tabs.map((tab) => ({
      hashAliases: tab.hashAliases ?? [],
      id: tab.id,
    })),
  );
  const [activeTabId, setActiveTabId] = useState(fallbackId);

  useEffect(() => {
    const tabTargets = JSON.parse(tabTargetSignature) as WorkspaceTabTarget[];

    function selectHashTab() {
      const hashId = window.location.hash.slice(1);
      const hashTabId = resolveWorkspaceTabId(tabTargets, hashId);

      if (hashTabId) {
        setActiveTabId(hashTabId);
      }
    }

    selectHashTab();
    window.addEventListener("hashchange", selectHashTab);

    return () => window.removeEventListener("hashchange", selectHashTab);
  }, [tabTargetSignature]);

  useEffect(() => {
    const hashId = window.location.hash.slice(1);
    const tabTargets = JSON.parse(tabTargetSignature) as WorkspaceTabTarget[];
    const hashTabId = resolveWorkspaceTabId(tabTargets, hashId);

    if (hashTabId !== activeTabId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hashId)?.scrollIntoView({ block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeTabId, tabTargetSignature]);

  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) ??
    tabs.find((tab) => tab.id === fallbackId) ??
    tabs[0];

  if (!activeTab) {
    return null;
  }

  function selectTab(tabId: string) {
    setActiveTabId(tabId);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${tabId}`,
    );
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    selectTab(tabs[nextIndex].id);
    const tabButtons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    tabButtons?.[nextIndex]?.focus();
  }

  return (
    <div className="nf-tabbed-workspace">
      <div
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        className="nf-workspace-tablist"
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeTab.id;

          return (
            <button
              aria-controls={`${tab.id}-panel`}
              aria-selected={selected}
              className={selected ? "nf-workspace-tab-active" : undefined}
              id={`${tab.id}-tab`}
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <span>{tab.label}</span>
              {tab.meta ? <small>{tab.meta}</small> : null}
            </button>
          );
        })}
      </div>

      <div
        aria-labelledby={`${activeTab.id}-tab`}
        className="nf-workspace-tabpanel"
        id={`${activeTab.id}-panel`}
        role="tabpanel"
        tabIndex={0}
      >
        {activeTab.content}
      </div>
    </div>
  );
}
