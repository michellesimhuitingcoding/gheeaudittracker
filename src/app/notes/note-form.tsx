"use client";

import { useEffect, useRef } from "react";
import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";
import { MAX_NOTE_LENGTH } from "@/lib/notes/schema";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function NoteForm({ action }: { action: Action }) {
  const [state, onSubmit, pending] = useFormAction(action);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex max-w-xl flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        Add a note
        <textarea
          name="body"
          rows={3}
          required
          maxLength={MAX_NOTE_LENGTH}
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <FieldError state={state} name="body" />
      </label>
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
