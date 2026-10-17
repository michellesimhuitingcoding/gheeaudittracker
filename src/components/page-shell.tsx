import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({ title, back, children }: { title: string; back?: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8">
      <header className="flex flex-col gap-1">
        {back && (
          <Link href={back} className="text-sm text-zinc-600 underline">
            Back
          </Link>
        )}
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
      </header>
      {children}
    </main>
  );
}
