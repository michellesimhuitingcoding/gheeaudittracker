import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("exports a page component", () => {
    expect(typeof Home).toBe("function");
  });
});
