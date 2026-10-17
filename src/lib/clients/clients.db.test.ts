import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import {
  addExternalAuditor,
  createClient,
  removeExternalAuditor,
  updateClient,
  updateExternalAuditor,
} from "@/lib/clients/service";
import { db } from "@/lib/db";

const tag = () => randomUUID().slice(0, 8);
let admin: { id: string; role: Role };
let intake: { id: string; role: Role };
let manager: { id: string; role: Role };
let otherManager: { id: string; role: Role };
let partner: { id: string; role: Role };
let partner2: { id: string; role: Role };
let junior: { id: string; role: Role };

async function staff(role: Role, name: string) {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `C-${id}`, name, email: `c-${id}@example.com`, role, passwordHash: "x" },
  });
  return { id: member.id, role: member.role };
}

function clientInput(overrides: Record<string, unknown> = {}) {
  return {
    name: `Client ${tag()}`,
    entityType: "SDN_BHD",
    regNo: `REG${tag()}`,
    tin: "",
    fyeDay: "31",
    fyeMonth: "12",
    ownerId: manager.id,
    managerId: manager.id,
    partnerId: partner.id,
    services: ["AUDIT"],
    dormant: false,
    status: "ACTIVE",
    prepareFormEA: false,
    auditBy: "INTERNAL",
    signingPartnerIds: [partner.id],
    ...overrides,
  };
}

async function newClient(overrides: Record<string, unknown> = {}) {
  const input = clientInput(overrides);
  const result = await createClient(intake, input);
  expect(result).toMatchObject({ ok: true });
  return { id: result.clientId!, input };
}

const lastEntry = (entityId: string) =>
  db.auditLog.findFirstOrThrow({ where: { entityId }, orderBy: [{ at: "desc" }, { id: "desc" }] });

beforeAll(async () => {
  admin = await staff("ADMIN", "Alice Admin");
  intake = await staff("AUDIT_ADMIN_ASSISTANT", "Ivy Intake");
  manager = await staff("MANAGER", "Mark Manager");
  otherManager = await staff("MANAGER", "Olive Manager");
  partner = await staff("PARTNER", "Peter Partner");
  partner2 = await staff("PARTNER", "Paula Partner");
  junior = await staff("JUNIOR", "Jim Junior");
});

describe("clients (database)", () => {
  it("adds a client and logs it with names, not IDs", async () => {
    const { id } = await newClient();
    const entry = await lastEntry(id);
    expect(entry).toMatchObject({ action: "CLIENT_CREATED", actorId: intake.id, entityType: "Client" });
    expect(entry.changes).toMatchObject({
      owner: "Mark Manager",
      partner: "Peter Partner",
      signingPartners: "Peter Partner",
      fye: "31 Dec",
      paymentStatus: "Not invoiced",
      auditBy: "Internal",
    });
  });

  it("requires the right roles for owner, manager, partner and signing partners", async () => {
    const result = await createClient(
      intake,
      clientInput({ ownerId: junior.id, managerId: partner.id, partnerId: manager.id, signingPartnerIds: [manager.id] }),
    );
    expect(result).toMatchObject({ ok: false });
    expect(Object.keys((result as { fieldErrors: object }).fieldErrors).sort()).toEqual([
      "managerId",
      "ownerId",
      "partnerId",
      "signingPartnerIds",
    ]);
  });

  it("rejects a duplicate registration no. and logs nothing", async () => {
    const { input } = await newClient();
    const before = await db.auditLog.count();
    const result = await createClient(intake, clientInput({ regNo: input.regNo }));
    expect(result).toEqual({
      ok: false,
      fieldErrors: { regNo: ["This registration no. is already used by another client."] },
    });
    expect(await db.auditLog.count()).toBe(before);
  });

  it("locks the owner after intake except for Admin", async () => {
    const { id, input } = await newClient();
    expect(await updateClient(intake, id, { ...input, ownerId: partner.id })).toMatchObject({
      ok: false,
      fieldErrors: { ownerId: ["Sourced by is locked after intake. Ask Admin to change it."] },
    });
    expect(await updateClient(admin, id, { ...input, ownerId: partner.id })).toMatchObject({ ok: true });
    expect((await lastEntry(id)).changes).toEqual({ owner: { from: "Mark Manager", to: "Peter Partner" } });
  });

  it("lets only Admin change the payment status", async () => {
    const { id, input } = await newClient();
    expect(await updateClient(intake, id, { ...input, paymentStatus: "PAID" })).toMatchObject({
      ok: false,
      fieldErrors: { paymentStatus: ["Only Admin can change the payment status."] },
    });
    expect(await createClient(intake, clientInput({ paymentStatus: "PAID" }))).toMatchObject({ ok: false });
    expect(await updateClient(admin, id, { ...input, paymentStatus: "PARTIAL" })).toMatchObject({ ok: true });
    expect((await lastEntry(id)).changes).toEqual({ paymentStatus: { from: "Not invoiced", to: "Partial" } });
  });

  it("lets the client's own Manager edit, but not another Manager", async () => {
    const { id, input } = await newClient();
    expect(await updateClient(otherManager, id, { ...input, name: "Hijack" })).toMatchObject({ ok: false });
    expect(await updateClient(manager, id, { ...input, contactPhone: "082-111222" })).toMatchObject({ ok: true });
  });

  it("logs signing partner changes", async () => {
    const { id, input } = await newClient();
    await updateClient(intake, id, { ...input, signingPartnerIds: [partner.id, partner2.id] });
    expect((await lastEntry(id)).changes).toEqual({
      signingPartners: { from: "Peter Partner", to: "Paula Partner, Peter Partner" },
    });
    const rows = await db.clientSigningPartner.findMany({ where: { clientId: id } });
    expect(rows).toHaveLength(2);
  });

  it("still saves edits when an assigned Manager has since been deactivated", async () => {
    const leaving = await staff("MANAGER", "Leaving Manager");
    const { id, input } = await newClient({ managerId: leaving.id });
    await db.staff.update({ where: { id: leaving.id }, data: { active: false } });
    expect(await updateClient(intake, id, { ...input, managerId: leaving.id, contactName: "Ah Seng" })).toMatchObject({
      ok: true,
      message: "Changes saved.",
    });
  });

  it("adds, changes and removes external auditors with audit entries", async () => {
    const { id } = await newClient({ auditBy: "EXTERNAL" });
    expect(await addExternalAuditor(intake, id, { firmName: "ABC & Co", auditDeadline: "2026-12-31" })).toMatchObject({
      ok: true,
    });
    expect(await addExternalAuditor(intake, id, { firmName: "XYZ PLT" })).toMatchObject({ ok: true });
    const auditors = await db.externalAuditor.findMany({ where: { clientId: id }, orderBy: { createdAt: "asc" } });
    expect(auditors.map((auditor) => auditor.firmName)).toEqual(["ABC & Co", "XYZ PLT"]);

    await updateExternalAuditor(intake, auditors[0].id, { firmName: "ABC & Co", status: "Fieldwork" });
    expect((await lastEntry(id)).changes).toEqual({
      status: { from: null, to: "Fieldwork" },
      auditDeadline: { from: "2026-12-31", to: null },
    });

    await removeExternalAuditor(intake, auditors[1].id);
    expect(await lastEntry(id)).toMatchObject({ action: "EXTERNAL_AUDITOR_REMOVED" });
    expect(await db.externalAuditor.count({ where: { clientId: id } })).toBe(1);
  });

  it("blocks external auditor changes by people who cannot edit the client", async () => {
    const { id } = await newClient();
    expect(await addExternalAuditor(otherManager, id, { firmName: "Nope" })).toMatchObject({ ok: false });
    expect(await addExternalAuditor(junior, id, { firmName: "Nope" })).toMatchObject({ ok: false });
  });
});
