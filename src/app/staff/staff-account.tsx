"use client";

import { useActionState } from "react";
import { FieldError, FormMessage } from "@/components/form-message";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ActiveToggle({ action, active }: { action: Action; active: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <p className="text-sm text-zinc-700">
        Status: <strong>{active ? "Active" : "Inactive"}</strong>
      </p>
      <input type="hidden" name="active" value={String(!active)} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
      >
        {active ? "Deactivate" : "Reactivate"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function ResetPasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        New password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <FieldError state={state} name="password" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
      >
        Reset password
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function LastDayForm({ action, lastDay }: { action: Action; lastDay: string }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        Last working day (leave blank to clear)
        <input
          name="lastDay"
          type="date"
          defaultValue={lastDay}
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <FieldError state={state} name="lastDay" />
      </label>
      <p className="text-xs text-zinc-500">They are deactivated automatically the day after. Their history is kept.</p>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
      >
        Save last day
      </button>
      <FormMessage state={state} />
    </form>
  );
}
