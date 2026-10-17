"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const inputClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-700";
const buttonClass = "rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50";

export function HourlyRateForm({ action, current }: { action: Action; current: string }) {
  const [state, onSubmit, pending] = useFormAction(action);

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-2">
      <input
        name="hourlyRate"
        type="number"
        step="0.01"
        min="0"
        defaultValue={current}
        aria-label="Hourly rate (RM)"
        className={`${inputClass} w-32`}
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        Save
      </button>
      <div className="w-full">
        <FieldError state={state} name="hourlyRate" />
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PublicHolidayForm({ action }: { action: Action }) {
  const [state, onSubmit, pending] = useFormAction(action);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className={labelClass}>
        Date
        <input name="date" type="date" required className={inputClass} />
      </label>
      <label className={labelClass}>
        Name
        <input name="name" required className={inputClass} />
      </label>
      <button type="submit" disabled={pending} className={buttonClass}>
        Add holiday
      </button>
      <div className="w-full">
        <FieldError state={state} name="date" />
        <FieldError state={state} name="name" />
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function RemoveHolidayButton({ action }: { action: () => Promise<FormState> }) {
  const [state, dispatch, pending] = useActionState<FormState>(() => action(), null);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Remove this public holiday?")) startTransition(() => dispatch());
        }}
        className="self-start text-sm text-red-700 underline disabled:opacity-50"
      >
        Remove
      </button>
      {state && !state.ok && <FormMessage state={state} />}
    </div>
  );
}
