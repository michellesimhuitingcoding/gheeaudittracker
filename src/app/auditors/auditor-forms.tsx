"use client";

import { useActionState, useEffect, useRef } from "react";
import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const inputClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900";
const buttonClass = "rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
const secondaryClass =
  "rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50";

export function AddAuditFirmForm({ action }: { action: Action }) {
  const [state, onSubmit, pending] = useFormAction(action);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        Firm name
        <input name="name" required className={`${inputClass} w-72`} />
      </label>
      <button type="submit" disabled={pending} className={buttonClass}>
        Add external auditor
      </button>
      <div className="w-full">
        <FieldError state={state} name="name" />
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function AuditFirmRow({
  name,
  internal,
  active,
  renameAction,
  toggleAction,
}: {
  name: string;
  internal: boolean;
  active: boolean;
  renameAction: Action;
  toggleAction: Action;
}) {
  const [state, onSubmit, pending] = useFormAction(renameAction);
  const [toggleState, toggle, toggling] = useActionState(toggleAction, null);

  return (
    <tr className="border-b border-zinc-100 align-top text-zinc-900">
      <td className="p-3">
        <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-2">
          <input name="name" defaultValue={name} required aria-label="Firm name" className={`${inputClass} w-72`} />
          <button type="submit" disabled={pending} className={secondaryClass}>
            Save
          </button>
          <div className="w-full">
            <FieldError state={state} name="name" />
            <FormMessage state={state} />
          </div>
        </form>
      </td>
      <td className="p-3">{internal ? "Internal (our firm)" : "External"}</td>
      <td className="p-3">
        {internal ? (
          "Active"
        ) : (
          <form action={toggle} className="flex flex-col gap-2">
            <span>{active ? "Active" : "Hidden"}</span>
            <button type="submit" disabled={toggling} className={`${secondaryClass} self-start`}>
              {active ? "Hide" : "Restore"}
            </button>
            <FormMessage state={toggleState} />
          </form>
        )}
      </td>
    </tr>
  );
}
