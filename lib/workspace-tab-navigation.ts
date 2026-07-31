export type WorkspaceTabTarget = {
  hashAliases?: readonly string[];
  id: string;
};

export function resolveWorkspaceTabId(
  tabs: readonly WorkspaceTabTarget[],
  hashId: string,
) {
  if (!hashId) {
    return null;
  }

  return (
    tabs.find(
      (tab) =>
        tab.id === hashId || (tab.hashAliases ?? []).includes(hashId),
    )?.id ?? null
  );
}
