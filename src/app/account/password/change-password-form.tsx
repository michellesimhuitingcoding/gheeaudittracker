"use client";

import Link from "next/link";
import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import { MIN_PASSWORD_LENGTH } from "@/lib/staff-schema";
import { changePasswordAction } from "./actions";

const inputClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-700";

export function ChangePasswordForm({ temporary }: { temporary: boolean }) {
  const [state, onSubmit, pending] = useFormAction(changePasswordAction);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <Link href="/" className="rounded bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white">
          Continue
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {temporary && (
        <p className="text-sm text-zinc-700">
          You logged in with a temporary password. Choose your own password to continue.
        </p>
      )}
      <label className={labelClass}>
        {temporary ? "Temporary password" : "Current password"}
        <input name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
        <FieldError state={state} name="currentPassword" />
      </label>
      <label className={labelClass}>
        New password
        <input name="password" type="password" autoComplete="new-password" required className={inputClass} />
        <span className="text-xs text-zinc-500">At least {MIN_PASSWORD_LENGTH} characters.</span>
        <FieldError state={state} name="password" />
      </label>
      <label className={labelClass}>
        Confirm new password
        <input name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
        <FieldError state={state} name="confirm" />
      </label>
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
