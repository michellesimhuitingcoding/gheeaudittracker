"use client";

import { useActionState } from "react";
import { FieldError, FormMessage } from "@/components/form-message";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS, ROLES } from "@/lib/roles";
import type { FormState } from "@/lib/form-state";

type StaffValues = { staffId: string; name: string; email: string; role: Role };

const inputClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-700";

export function StaffForm({
  action,
  values,
  submitLabel,
  withPassword = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values?: StaffValues;
  submitLabel: string;
  withPassword?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <label className={labelClass}>
        Staff ID
        <input name="staffId" defaultValue={values?.staffId} required className={inputClass} />
        <FieldError state={state} name="staffId" />
      </label>
      <label className={labelClass}>
        Name
        <input name="name" defaultValue={values?.name} required className={inputClass} />
        <FieldError state={state} name="name" />
      </label>
      <label className={labelClass}>
        Email
        <input name="email" type="email" defaultValue={values?.email} required className={inputClass} />
        <FieldError state={state} name="email" />
      </label>
      <label className={labelClass}>
        Role
        <select name="role" defaultValue={values?.role ?? ""} required className={inputClass}>
          <option value="" disabled>
            Choose a role
          </option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <FieldError state={state} name="role" />
      </label>
      {withPassword && (
        <label className={labelClass}>
          Starting password
          <input name="password" type="password" autoComplete="new-password" required className={inputClass} />
          <FieldError state={state} name="password" />
        </label>
      )}
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
