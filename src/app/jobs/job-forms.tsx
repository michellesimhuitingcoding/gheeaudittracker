"use client";

import { useEffect, useRef } from "react";
import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const inputClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-700";

function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function StageMoveForm({
  action,
  fromStage,
  toLabel,
  needsReviewNote,
}: {
  action: Action;
  fromStage: string;
  toLabel: string;
  needsReviewNote: boolean;
}) {
  const [state, onSubmit, pending] = useFormAction(action);
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="fromStage" value={fromStage} />
      <label className={labelClass}>
        Progress note
        <textarea name="progressNote" rows={3} required className={inputClass} />
        <FieldError state={state} name="progressNote" />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className={labelClass}>
          Hours
          <input name="hours" type="number" step="0.25" min="0.25" required className={inputClass} />
          <FieldError state={state} name="hours" />
        </label>
        <label className={labelClass}>
          Next action
          <input name="nextAction" required className={inputClass} />
          <FieldError state={state} name="nextAction" />
        </label>
      </div>
      {needsReviewNote && (
        <label className={labelClass}>
          Review note (required)
          <textarea name="reviewNote" rows={3} required className={inputClass} />
          <FieldError state={state} name="reviewNote" />
        </label>
      )}
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : `Move to ${toLabel}`}
      </button>
    </form>
  );
}

export function CreateJobForm({ action, defaultYear }: { action: Action; defaultYear: number }) {
  const [state, onSubmit, pending] = useFormAction(action);

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className={labelClass}>
        Financial year
        <input name="year" type="number" defaultValue={defaultYear} required className={`${inputClass} w-32`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Create audit job
      </button>
      <div className="w-full">
        <FieldError state={state} name="year" />
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function CheckInButton({ action, checkedIn }: { action: Action; checkedIn: boolean }) {
  const [state, onSubmit, pending] = useFormAction(action);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending || checkedIn}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {checkedIn ? "Checked in today" : pending ? "Saving…" : "I'm working on this today"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
