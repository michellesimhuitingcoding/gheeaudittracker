import { describe, expect, it } from "vitest";
import { MAX_NOTE_LENGTH, noteSchema } from "@/lib/notes/schema";

describe("noteSchema", () => {
  it("trims the note", () => {
    expect(noteSchema.parse({ body: "  Chased bank confirmation  " })).toEqual({ body: "Chased bank confirmation" });
  });

  it("rejects blank and overlong notes", () => {
    expect(noteSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(noteSchema.safeParse({ body: "x".repeat(MAX_NOTE_LENGTH + 1) }).success).toBe(false);
  });
});
