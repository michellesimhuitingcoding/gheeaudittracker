import { z } from "zod";

export const MAX_NOTE_LENGTH = 2000;

export const noteSchema = z.object({
  body: z
    .string({ error: "Write a note." })
    .trim()
    .min(1, { error: "Write a note." })
    .max(MAX_NOTE_LENGTH, { error: `Notes can be at most ${MAX_NOTE_LENGTH} characters.` }),
});
