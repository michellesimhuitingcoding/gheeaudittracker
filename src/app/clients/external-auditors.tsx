"use client";

import { useActionState, useEffect, useRef } from "react";
import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export type AuditorValues = {
  id: string;
  firmName: string;
  contact: string | null;
  auditDeadline: string | null;
  status: string | null;
};

const inputClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-700";

function AuditorFields({ state, values }: { state: FormState; values?: AuditorValues }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className={labelClass}>
        Firm name
        <input name="firmName" defaultValue={values?.firmName} required className={inputClass} />
        <FieldError state={state} name="firmName" />
      </label>
      <label className={labelClass}>
        Contact
        <input name="contact" defaultValue={values?.contact ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Audit deadline
        <input name="auditDeadline" type="date" defaultValue={values?.auditDeadline ?? ""} className={inputClass} />
        <FieldError state={state} name="auditDeadline" />
      </label>
      <label className={labelClass}>
        Status
        <input name="status" defaultValue={values?.status ?? ""} className={inputClass} />
      </label>
    </div>
  );
}

export function ExternalAuditorRow({
  values,
  updateAction,
  removeAction,
}: {
  values: AuditorValues;
  updateAction: Action;
  removeAction: Action;
}) {
  const [state, onSubmit, pending] = useFormAction(updateAction);
  const [removeState, remove, removing] = useActionState(removeAction, null);

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <AuditorFields state={state} values={values} />
        <FormMessage state={state} />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
        >
          Save auditor
        </button>
      </form>
      <form action={remove}>
        <button
          type="submit"
          disabled={removing}
          className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Remove {values.firmName}
        </button>
        <FormMessage state={removeState} />
      </form>
    </div>
  );
}

export function AddExternalAuditor({ action }: { action: Action }) {
  const [state, onSubmit, pending] = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form once an auditor has been added.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3 rounded border border-dashed border-zinc-300 p-4">
      <AuditorFields state={state} />
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Add external auditor
      </button>
    </form>
  );
}
