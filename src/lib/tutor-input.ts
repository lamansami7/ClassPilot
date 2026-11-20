import { z } from "zod";
// Only the newest student turn comes from the browser; history is read under RLS.
export const tutorTurn = z.object({
  id: z.string().min(1).max(128),
  role: z.literal("user"),
  parts: z
    .array(z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(12000) }))
    .length(1),
});
