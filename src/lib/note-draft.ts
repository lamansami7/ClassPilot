export type NoteDraft = { title: string; topic: string; content: string };
export const draftPrefix = "classpilot:tab-draft:";
export function readDraft(key: string): NoteDraft | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && ["title", "topic", "content"].every((k) => typeof d[k] === "string") ? d : null;
  } catch {
    return null;
  }
}
export function storeDraft(key: string, draft: NoteDraft | null) {
  try {
    if (draft) sessionStorage.setItem(key, JSON.stringify(draft));
    else sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
export function clearDrafts() {
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith(draftPrefix)) sessionStorage.removeItem(key);
  } catch {
    /* Storage can be disabled */
  }
}
