import type { ReactNode } from "react";

// The centred card shared by the login and password pages.
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900">{title}</h1>
        {children}
      </div>
    </main>
  );
}
