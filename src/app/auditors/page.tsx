import type { Metadata } from "next";
import { Suspense } from "react";
import { NoPermission } from "@/components/no-permission";
import { PageShell } from "@/components/page-shell";
import { MANAGE_AUDIT_FIRMS } from "@/lib/audit-firms/schema";
import { requireStaff } from "@/lib/current-staff";
import { db } from "@/lib/db";
import { hasRole } from "@/lib/permissions";
import { addAuditFirmAction, renameAuditFirmAction, setAuditFirmActiveAction } from "./actions";
import { AddAuditFirmForm, AuditFirmRow } from "./auditor-forms";

export const metadata: Metadata = { title: "Auditors" };

async function Auditors() {
  const viewer = await requireStaff();
  if (!hasRole(viewer.role, MANAGE_AUDIT_FIRMS)) return <NoPermission />;

  const firms = await db.auditFirm.findMany({
    orderBy: [{ internal: "desc" }, { active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, internal: true, active: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600">
        Firms listed here are the choices for a client&apos;s &ldquo;Audit by&rdquo;. A hidden firm is no longer offered,
        but clients already using it keep it.
      </p>
      <table className="w-full max-w-3xl border-collapse bg-white text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th className="p-3 font-medium">Firm</th>
            <th className="p-3 font-medium">Type</th>
            <th className="p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {firms.map((firm) => (
            <AuditFirmRow
              key={firm.id}
              name={firm.name}
              internal={firm.internal}
              active={firm.active}
              renameAction={renameAuditFirmAction.bind(null, firm.id)}
              toggleAction={setAuditFirmActiveAction.bind(null, firm.id, !firm.active)}
            />
          ))}
        </tbody>
      </table>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-zinc-900">Add an external auditor</h2>
        <AddAuditFirmForm action={addAuditFirmAction} />
      </section>
    </div>
  );
}

export default function AuditorsPage() {
  return (
    <PageShell title="Auditors" back="/">
      <Suspense fallback={null}>
        <Auditors />
      </Suspense>
    </PageShell>
  );
}
