import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { isResetLinkValid } from "@/lib/password-reset/service";
import { RESET_LINK_INVALID } from "@/lib/password-reset/schema";
import { resetPasswordAction } from "../actions";
import { AuthCard } from "../auth-card";
import { ResetPasswordForm } from "./reset-password-form";

// The token is in the URL; keep it out of Referer headers.
export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer" };

async function ResetPassword({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";

  if (!(await isResetLinkValid(token))) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-sm text-red-600">
          {RESET_LINK_INVALID}
        </p>
        <Link href="/login/forgot-password" className="text-sm text-zinc-600 underline">
          Request a new link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm action={resetPasswordAction.bind(null, token)} />;
}

export default function ResetPasswordPage({ searchParams }: PageProps<"/login/reset-password">) {
  return (
    <AuthCard title="Reset password">
      <Suspense fallback={null}>
        <ResetPassword searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
