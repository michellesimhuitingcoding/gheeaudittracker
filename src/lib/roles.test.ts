import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";

function workflowLoginRoles(): string[] {
  const workflow = readFileSync("workflow.md", "utf8");
  const match = workflow.match(/\*\*Login roles:\*\*\s*\n(.+)\n/);
  if (!match) {
    throw new Error("Login roles not found in workflow.md");
  }
  return match[1]
    .split(",")
    .map((role) => role.trim().toUpperCase().replace(/\s+/g, "_"));
}

describe("Role enum", () => {
  it("matches the login roles in workflow.md", () => {
    expect(Object.values(Role).sort()).toEqual(workflowLoginRoles().sort());
  });
});
