import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { addInternalNote } from "@/lib/notes/service";

type Person = { id: string; role: Role };
const tag = () => randomUUID().slice(0, 8);
let manager: Person, senior: Person, outsider: Person;
let clientId: string, jobId: string, otherJobId: string;

async function staff(role: Role, name: string): Promise<Person> {
  const id = tag();
  const member = await db.staff.create({
    data: { staffId: `N-${id}`, name, email: `n-${id}@example.com`, role, passwordHash: "x" },
  });
  return { id: member.id, role };
}

async function client(managerId: string, seniorId: string | null) {
  return db.client.create({
    data: {
      name: `Note Co ${tag()}`,
      entityType: "SDN_BHD",
      fyeDay: 31,
      fyeMonth: 12,
      ownerId: managerId,
      managerId,
      seniorId,
      services: ["AUDIT"],
    },
  });
}

beforeAll(async () => {
  manager = await staff("MANAGER", "Note Manager");
  senior = await staff("SENIOR", "Note Senior");
  outsider = await staff("SENIOR", "Unassigned Note Senior");
  clientId = (await client(manager.id, senior.id)).id;
  jobId = (await db.auditJob.create({ data: { clientId, year: 2025, createdById: manager.id } })).id;
  const other = await client(manager.id, null);
  otherJobId = (await db.auditJob.create({ data: { clientId: other.id, year: 2025, createdById: manager.id } })).id;
});

describe("internal notes (database)", () => {
  it("lets the client's team add notes and records them in the audit log", async () => {
    expect(await addInternalNote(senior, { clientId, jobId }, { body: "Waiting on bank confirmation" })).toEqual({
      ok: true,
      message: "Note added.",
    });
    expect(await addInternalNote(manager, { clientId }, { body: "Director prefers email" })).toMatchObject({ ok: true });

    const notes = await db.internalNote.findMany({ where: { clientId }, orderBy: { createdAt: "asc" } });
    expect(notes.map((note) => [note.jobId, note.body])).toEqual([
      [jobId, "Waiting on bank confirmation"],
      [null, "Director prefers email"],
    ]);
    const logged = await db.auditLog.findFirstOrThrow({ where: { action: "INTERNAL_NOTE_ADDED", actorId: senior.id } });
    expect(logged).toMatchObject({ entityType: "AuditJob", entityId: jobId });
  });

  it("blocks staff who cannot see the client and jobs of another client", async () => {
    expect(await addInternalNote(outsider, { clientId }, { body: "Hi" })).toMatchObject({ ok: false });
    expect(await addInternalNote(manager, { clientId, jobId: otherJobId }, { body: "Hi" })).toEqual({
      ok: false,
      error: "Audit job not found.",
    });
  });

  it("is append-only", async () => {
    const note = await db.internalNote.findFirstOrThrow({ where: { clientId } });
    await expect(db.internalNote.update({ where: { id: note.id }, data: { body: "x" } })).rejects.toThrow(/append-only/);
    await expect(db.internalNote.delete({ where: { id: note.id } })).rejects.toThrow(/append-only/);
  });
});
