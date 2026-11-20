import { expect, it } from "vitest";
import { clearDrafts, draftPrefix, readDraft, storeDraft } from "@/lib/note-draft";
it("recovers a tab draft, not another note, and removes it at signout", () => {
  const key = draftPrefix + "synthetic:note";
  const d = { title: "Slope", topic: "Math", content: "Rise / run" };
  storeDraft(key, d);
  expect(readDraft(key)).toEqual(d);
  expect(readDraft(key + "2")).toBeNull();
  clearDrafts();
  expect(readDraft(key)).toBeNull();
});
