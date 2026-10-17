"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const inputClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-700";

export function LeaveForm({ action, staffId, today }: { action: Action; staffId: string; today: string }) {
  const [state, onSubmit, pending] = useFormAction(action);
  const [length, setLength] = useState<"FULL" | "PART">("FULL");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="staffId" value={staffId} />
      <fieldset className="flex gap-6 text-sm text-zinc-700">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="length"
            value="FULL"
            checked={length === "FULL"}
            onChange={() => setLength("FULL")}
          />
          Whole day(s)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="length"
            value="PART"
            checked={length === "PART"}
            onChange={() => setLength("PART")}
          />
          Part day (hours)
        </label>
      </fieldset>
      <div className="grid grid-cols-3 gap-4">
        <label className={labelClass}>
          {length === "FULL" ? "From" : "Date"}
          <input name="from" type="date" required defaultValue={today} className={inputClass} />
          <FieldError state={state} name="from" />
        </label>
        {length === "FULL" ? (
          <label className={labelClass}>
            To (blank for one day)
            <input name="to" type="date" className={inputClass} />
            <FieldError state={state} name="to" />
          </label>
        ) : (
          <label className={labelClass}>
            Hours away
            <input name="hours" type="number" step="0.5" min="0.5" max="7.5" required className={inputClass} />
            <FieldError state={state} name="hours" />
          </label>
        )}
      </div>
      <label className={labelClass}>
        Note
        <input name="note" className={inputClass} />
        <FieldError state={state} name="note" />
      </label>
      <FieldError state={state} name="staffId" />
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Record leave"}
      </button>
    </form>
  );
}

export function RemoveLeaveButton({ action }: { action: () => Promise<FormState> }) {
  const [state, dispatch, pending] = useActionState<FormState>(() => action(), null);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Remove this leave?")) startTransition(() => dispatch());
        }}
        className="self-start text-sm text-red-700 underline disabled:opacity-50"
      >
        Remove
      </button>
      {state && !state.ok && <FormMessage state={state} />}
    </div>
  );
}
