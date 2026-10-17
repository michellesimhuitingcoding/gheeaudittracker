import { describe, expect, it } from "vitest";
import { clientListWhere, groupByManager, parseClientListSearch } from "@/lib/clients/list";

describe("parseClientListSearch", () => {
  it("keeps known values and drops unknown ones", () => {
    expect(
      parseClientListSearch({ q: "  kenyalang ", entityType: "PLT", service: "HACK", status: "ACTIVE", show: "mine" }),
    ).toEqual({ q: "kenyalang", entityType: "PLT", service: undefined, status: "ACTIVE", payment: undefined, mine: true });
    expect(parseClientListSearch({ show: ["all", "mine"] }).mine).toBe(false);
  });
});

describe("clientListWhere", () => {
  it("always includes the visibility filter", () => {
    const visible = { managerId: "m1" };
    expect(clientListWhere(visible, { mine: false })).toEqual({ AND: [visible] });
  });

  it("searches name, reg. no. and TIN", () => {
    const where = clientListWhere({}, { q: "2020 0101", mine: false });
    expect(where.AND).toContainEqual({
      OR: [
        { name: { contains: "2020 0101", mode: "insensitive" } },
        { regNo: { contains: "20200101" } },
        { tin: { contains: "20200101" } },
      ],
    });
  });

  it("adds each chosen filter", () => {
    const where = clientListWhere({}, { service: "AUDIT", payment: "UNPAID", mine: false });
    expect(where.AND).toContainEqual({ services: { has: "AUDIT" } });
    expect(where.AND).toContainEqual({ paymentStatus: "UNPAID" });
  });
});

describe("groupByManager", () => {
  it("groups by Manager A–Z with Unassigned last", () => {
    const groups = groupByManager([
      { id: 1, manager: { name: "Zara" } },
      { id: 2, manager: null },
      { id: 3, manager: { name: "Ali" } },
      { id: 4, manager: { name: "Zara" } },
    ]);
    expect(groups.map((group) => [group.manager, group.clients.map((client) => client.id)])).toEqual([
      ["Ali", [3]],
      ["Zara", [1, 4]],
      ["Unassigned", [2]],
    ]);
  });
});
