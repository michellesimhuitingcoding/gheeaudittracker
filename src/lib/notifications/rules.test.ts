import { describe, expect, it } from "vitest";
import { groupByClient, turnRecipients } from "@/lib/notifications/rules";

const people = {
  managerId: "mgr",
  partnerId: "ptr",
  seniorId: "snr",
  signingPartnerIds: ["sp", "ptr"],
  assignedStaff: [
    { staffId: "jr", role: "JUNIOR" as const },
    { staffId: "adm", role: "ADMIN" as const },
  ],
};

describe("turnRecipients", () => {
  it("notifies only whoever works the stage", () => {
    expect(turnRecipients(null, people)).toEqual(["snr"]);
    expect(turnRecipients("IN_PROGRESS", people)).toEqual(["snr"]);
    expect(turnRecipients("MANAGER_REVIEW", people)).toEqual(["mgr"]);
    expect(turnRecipients("PARTNER_REVIEW", people)).toEqual(["ptr", "sp"]);
    expect(turnRecipients("CLEAR_REVIEW", people)).toEqual(["snr"]);
    expect(turnRecipients("FINAL_REVIEW", people)).toEqual(["mgr"]);
    expect(turnRecipients("FINALISATION", people)).toEqual([]);
  });

  it("falls back to assigned Juniors/Seniors when there is no Senior", () => {
    expect(turnRecipients("READY", { ...people, seniorId: null })).toEqual(["jr"]);
    expect(turnRecipients("MANAGER_REVIEW", { ...people, managerId: null })).toEqual([]);
  });
});

describe("groupByClient", () => {
  it("groups by client in first-seen order", () => {
    const groups = groupByClient([
      { id: 1, clientId: "a", clientName: "Miri" },
      { id: 2, clientId: "b", clientName: "Sibu" },
      { id: 3, clientId: "a", clientName: "Miri" },
    ]);
    expect(groups.map((group) => [group.clientName, group.items.map((item) => item.id)])).toEqual([
      ["Miri", [1, 3]],
      ["Sibu", [2]],
    ]);
  });
});
