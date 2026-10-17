import { describe, expect, it } from "vitest";
import { z } from "zod";
import { daysInMonth, formatFye } from "@/lib/clients/options";
import { clientSchema, externalAuditorSchema } from "@/lib/clients/schema";

const valid = {
  name: " Kenyalang Trading Sdn Bhd ",
  entityType: "SDN_BHD",
  regNo: " 2020 0101 2345 ",
  tin: "c 1234567890",
  fyeDay: "31",
  fyeMonth: "12",
  incorporationDate: "2020-03-15",
  ownerId: "owner",
  managerId: "",
  partnerId: "ptr",
  services: ["AUDIT", "TAX"],
  dormant: false,
  status: "ACTIVE",
  prepareFormEA: true,
  auditBy: "",
  signingPartnerIds: ["p1", "p2", "p1"],
  contactName: "",
  contactPhone: "082-123456",
  contactEmail: " Finance@Kenyalang.MY ",
  address: "",
};

function errors(input: unknown) {
  const result = clientSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("client validation", () => {
  it("normalises values", () => {
    const client = clientSchema.parse(valid);
    expect(client).toMatchObject({
      name: "Kenyalang Trading Sdn Bhd",
      regNo: "202001012345",
      tin: "C1234567890",
      fyeDay: 31,
      fyeMonth: 12,
      managerId: null,
      auditBy: null,
      signingPartnerIds: ["p1", "p2"],
      contactName: null,
      contactEmail: "finance@kenyalang.my",
      address: null,
    });
    expect(client.incorporationDate?.toISOString()).toBe("2020-03-15T00:00:00.000Z");
  });

  it("requires name, entity type, FYE, owner and a service", () => {
    const result = errors({ ...valid, name: " ", entityType: "", fyeDay: "", fyeMonth: "", ownerId: "", services: [] });
    expect(Object.keys(result).sort()).toEqual(["entityType", "fyeDay", "fyeMonth", "name", "ownerId", "services"]);
  });

  it("rejects an FYE day that does not exist in the month", () => {
    expect(errors({ ...valid, fyeDay: "31", fyeMonth: "6" }).fyeDay).toEqual([
      "That day does not exist in the chosen month.",
    ]);
    expect(errors({ ...valid, fyeDay: "29", fyeMonth: "2" })).toEqual({});
  });

  it("rejects bad or future incorporation dates", () => {
    expect(errors({ ...valid, incorporationDate: "2020-02-30" }).incorporationDate).toBeDefined();
    expect(errors({ ...valid, incorporationDate: "2999-01-01" }).incorporationDate).toEqual([
      "Incorporation date cannot be in the future.",
    ]);
  });

  it("rejects an invalid contact email and unknown options", () => {
    const result = errors({ ...valid, contactEmail: "nope", entityType: "LLC", services: ["CONSULTING"] });
    expect(result.contactEmail).toEqual(["Enter a valid email address."]);
    expect(result.entityType).toBeDefined();
    expect(result.services).toBeDefined();
  });

  it("validates external auditors", () => {
    expect(externalAuditorSchema.safeParse({ firmName: " " }).success).toBe(false);
    expect(externalAuditorSchema.parse({ firmName: " ABC & Co ", auditDeadline: "2026-12-31" })).toMatchObject({
      firmName: "ABC & Co",
      contact: null,
      status: null,
    });
  });
});

describe("FYE helpers", () => {
  it("formats and bounds FYE days", () => {
    expect(formatFye(31, 12)).toBe("31 Dec");
    expect(daysInMonth(2)).toBe(29);
    expect(daysInMonth(4)).toBe(30);
  });
});
