import { expect, it } from "vitest";
import { tutorTurn } from "@/lib/tutor-input";
const input = { id: "synthetic", role: "user", parts: [{ type: "text", text: "Explain slope." }] };
it("accepts a text question", () => expect(tutorTurn.safeParse(input).success).toBe(true));
it("rejects instruction roles, oversized or non-text turns", () => {
  for (const patch of [
    { role: "system" },
    { parts: [{ type: "file", url: "https://example.org/" }] },
    { parts: [{ type: "text", text: "x".repeat(12001) }] },
  ])
    expect(tutorTurn.safeParse({ ...input, ...patch }).success).toBe(false);
});
