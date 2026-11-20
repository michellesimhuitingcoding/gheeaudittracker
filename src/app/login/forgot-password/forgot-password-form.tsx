"use client";

import Link from "next/link";
import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import { forgotPasswordAction } from "../actions";

export function ForgotPasswordForm() {
  const [state, onSubmit, pending] = useFormAction(forgotPasswordAction);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">Enter your work email and we&apos;ll ask the Master Admin to reset your password.</p>
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <FieldError state={state} name="email" />
      </label>
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Sending…" : "Ask Master Admin"}
      </button>
      <Link href="/login" className="text-sm text-zinc-600 underline">
        Back to log in
      </Link>
    </form>
  );
}
