import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { addAuditFirm, auditFirmOptions, renameAuditFirm, setAuditFirmActive } from "@/lib/audit-firms/service";
import { createClient, updateClient } from "@/lib/clients/service";
import { db } from "@/lib/db";

const tag = () => randomUUID().slice(0, 8);
let masterAdmin: { id: string; role: Role };
let admin: { id: string; role: Role };
let manager: { id: string; role: Role };

async function staff(role: Role) {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `AF-${id}`, name: `Firm Test ${id}`, email: `af-${id}@example.com`, role, passwordHash: "x" },
  });
  return { id: member.id, role: member.role };
}

async function newFirm() {
  const name = `Firm ${tag()}`;
  expect(await addAuditFirm(masterAdmin, { name: ` ${name}  ` })).toEqual({ ok: true, message: `${name} added.` });
  return db.auditFirm.findUniqueOrThrow({ where: { name } });
}

function clientInput(auditFirmId: string) {
  return {
    name: `Client ${tag()}`,
    entityType: "SDN_BHD",
    fyeDay: "31",
    fyeMonth: "12",
    ownerId: manager.id,
    managerId: manager.id,
    services: ["AUDIT"],
    dormant: false,
    status: "ACTIVE",
    prepareFormEA: false,
    auditFirmId,
    signingPartnerIds: [],
  };
}

beforeAll(async () => {
  masterAdmin = await staff("MASTER_ADMIN");
  admin = await staff("ADMIN");
  manager = await staff("MANAGER");
});

describe("audit firms (database)", () => {
  it("starts with the firm's own practice and Wong Joo Hua", async () => {
    const seeded = await db.auditFirm.findMany({
      where: { id: { in: ["audit_firm_internal", "audit_firm_wong_joo_hua"] } },
      orderBy: { internal: "desc" },
      select: { name: true, internal: true },
    });
    expect(seeded).toEqual([
      { name: "G.H. Ee & Rakan-Rakan", internal: true },
      { name: "Wong Joo Hua", internal: false },
    ]);
    const options = await auditFirmOptions();
    expect(options[0]).toEqual({ id: "audit_firm_internal", name: "G.H. Ee & Rakan-Rakan" });
  });

  it("adds an external firm with an audit entry and refuses duplicates", async () => {
    const firm = await newFirm();
    expect(firm).toMatchObject({ internal: false, active: true });
    expect(await db.auditLog.findFirstOrThrow({ where: { entityId: firm.id } })).toMatchObject({
      action: "AUDIT_FIRM_ADDED",
      actorId: masterAdmin.id,
      changes: { name: firm.name },
    });
    expect(await addAuditFirm(masterAdmin, { name: firm.name })).toEqual({
      ok: false,
      fieldErrors: { name: ["An audit firm with this name already exists."] },
    });
  });

  it("lets only the Master Admin change firms", async () => {
    const firm = await newFirm();
    const refused = { ok: false, error: "Only the Master Admin can change audit firms." };
    expect(await addAuditFirm(admin, { name: `Firm ${tag()}` })).toEqual(refused);
    expect(await renameAuditFirm(admin, firm.id, { name: "Other" })).toEqual(refused);
    expect(await setAuditFirmActive(admin, firm.id, false)).toEqual(refused);
  });

  it("renames a firm and shows the new name on clients", async () => {
    const firm = await newFirm();
    const created = await createClient(admin, clientInput(firm.id));
    const renamed = `Renamed ${tag()}`;
    expect(await renameAuditFirm(masterAdmin, firm.id, { name: renamed })).toEqual({ ok: true, message: "Name saved." });
    const client = await db.client.findUniqueOrThrow({
      where: { id: (created as { clientId: string }).clientId },
      select: { auditFirm: { select: { name: true } } },
    });
    expect(client.auditFirm?.name).toBe(renamed);
  });

  it("never hides the firm's own practice", async () => {
    expect(await setAuditFirmActive(masterAdmin, "audit_firm_internal", false)).toEqual({
      ok: false,
      error: "Your own firm cannot be hidden.",
    });
  });

  it("hides a firm from new choices but keeps it on existing clients", async () => {
    const firm = await newFirm();
    const created = await createClient(admin, clientInput(firm.id));
    expect(created).toMatchObject({ ok: true });
    const clientId = (created as { clientId: string }).clientId;

    expect(await setAuditFirmActive(masterAdmin, firm.id, false)).toEqual({ ok: true, message: `${firm.name} hidden.` });
    expect((await auditFirmOptions()).map((option) => option.id)).not.toContain(firm.id);
    expect((await auditFirmOptions(firm.id)).map((option) => option.id)).toContain(firm.id);

    // Existing client still saves with the hidden firm; a new client cannot pick it.
    const input = clientInput(firm.id);
    expect(await updateClient(admin, clientId, { ...input, name: "Kept Firm Sdn Bhd" })).toMatchObject({ ok: true });
    expect(await createClient(admin, clientInput(firm.id))).toEqual({
      ok: false,
      fieldErrors: { auditFirmId: ["Choose an audit firm from the list."] },
    });

    expect(await setAuditFirmActive(masterAdmin, firm.id, true)).toMatchObject({ ok: true });
    expect(await createClient(admin, clientInput(firm.id))).toMatchObject({ ok: true });
  });

  it("logs a change of audit firm on a client by name", async () => {
    const created = await createClient(admin, clientInput("audit_firm_internal"));
    const clientId = (created as { clientId: string }).clientId;
    const input = clientInput("audit_firm_wong_joo_hua");
    const current = await db.client.findUniqueOrThrow({ where: { id: clientId } });
    expect(await updateClient(admin, clientId, { ...input, name: current.name })).toMatchObject({ ok: true });
    const entry = await db.auditLog.findFirstOrThrow({
      where: { entityId: clientId, action: "CLIENT_UPDATED" },
    });
    expect(entry.changes).toEqual({ auditBy: { from: "G.H. Ee & Rakan-Rakan", to: "Wong Joo Hua" } });
  });

  it("rejects an unknown firm", async () => {
    expect(await createClient(admin, clientInput("no-such-firm"))).toEqual({
      ok: false,
      fieldErrors: { auditFirmId: ["Choose an audit firm from the list."] },
    });
  });
});
