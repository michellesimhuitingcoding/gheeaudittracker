"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;
type Option = { value: string; label: string };
type Defaults = { category: string; jobId: string; hours: string; note: string };

const inputClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-700";

export function EntryForm({
  action,
  date,
  jobs,
  categories,
  defaults,
  submitLabel,
}: {
  action: Action;
  date: string;
  jobs: Option[];
  categories: Option[];
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !defaults) ref.current?.reset();
  }, [state, defaults]);

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="date" value={date} />
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
        <label className={labelClass}>
          Job
          <select name="jobId" defaultValue={defaults?.jobId ?? ""} className={inputClass}>
            <option value="">— None (Training/CPD) —</option>
            {jobs.map((job) => (
              <option key={job.value} value={job.value}>
                {job.label}
              </option>
            ))}
          </select>
          <FieldError state={state} name="jobId" />
        </label>
        <label className={labelClass}>
          Category
          <select name="category" defaultValue={defaults?.category ?? categories[0]?.value} className={inputClass}>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <FieldError state={state} name="category" />
        </label>
        <label className={labelClass}>
          Hours
          <input
            name="hours"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            required
            defaultValue={defaults?.hours}
            className={inputClass}
          />
          <FieldError state={state} name="hours" />
        </label>
      </div>
      <label className={labelClass}>
        Note
        <input name="note" defaultValue={defaults?.note} className={inputClass} />
        <FieldError state={state} name="note" />
      </label>
      <FieldError state={state} name="date" />
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

export function RemoveEntryButton({ action }: { action: () => Promise<FormState> }) {
  const [state, dispatch, pending] = useActionState<FormState>(() => action(), null);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Remove this entry?")) startTransition(() => dispatch());
        }}
        className="self-start text-sm text-red-700 underline disabled:opacity-50"
      >
        Remove
      </button>
      {state && !state.ok && <FormMessage state={state} />}
    </div>
  );
}
