import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { requireStaff } from "@/lib/current-staff";

async function CurrentStaff() {
  const staff = await requireStaff();

  return (
    <div className="flex items-center gap-4 text-sm text-zinc-700">
      <span>
        {staff.name} · {staff.role.replaceAll("_", " ").toLowerCase()}
      </span>
      <LogoutButton />
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Ghee Audit Tracker</h1>
        <Suspense fallback={null}>
          <CurrentStaff />
        </Suspense>
      </header>
    </main>
  );
}
