import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { NotificationBell } from "@/components/notification-bell";

export function PageShell({ title, back, children }: { title: string; back?: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8">
      <header className="flex flex-col gap-1">
        {back && (
          <Link href={back} className="text-sm text-zinc-600 underline">
            Back
          </Link>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
          <Suspense fallback={null}>
            <NotificationBell />
          </Suspense>
        </div>
      </header>
      {children}
    </main>
  );
}
