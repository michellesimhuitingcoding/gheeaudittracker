import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { requireStaff } from "@/lib/current-staff";
import { AuthCard } from "../../login/auth-card";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Change password" };

// No notification bell here: staff on a temporary password can open only this page.
async function ChangePassword() {
  const staff = await requireStaff(undefined, { passwordChange: true });

  return (
    <div className="flex flex-col gap-4">
      <ChangePasswordForm temporary={staff.mustChangePassword} />
      <div className="flex items-center justify-between">
        {staff.mustChangePassword ? (
          <span />
        ) : (
          <Link href="/" className="text-sm text-zinc-600 underline">
            Back
          </Link>
        )}
        <LogoutButton />
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <AuthCard title="Change password">
      <Suspense fallback={null}>
        <ChangePassword />
      </Suspense>
    </AuthCard>
  );
}
