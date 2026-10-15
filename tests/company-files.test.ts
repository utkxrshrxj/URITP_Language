// Checks the honesty and folder rules for every company folder, without naming any company:
// each company file starts with a "Company:" line, each driver README says it is untested on real
// hardware and not endorsed, and shared driver code names no company.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const companyFolders = ["drivers", "manifests"].flatMap((top) =>
  readdirSync(join(root, top), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "shared")
    .map((entry) => join(top, entry.name)),
);
const filesIn = (folder: string): string[] => readdirSync(join(root, folder)).map((name) => join(folder, name));

describe("company folders", () => {
  it("every company file starts with a Company line", () => {
    for (const file of companyFolders.flatMap(filesIn)) {
      const first = readFileSync(join(root, file), "utf8").split("\n")[0] ?? "";
      expect(first, file).toMatch(/Company: \S/);
    }
  });

  it("every driver has a README that is honest about hardware and endorsement", () => {
    for (const folder of companyFolders.filter((f) => f.startsWith("drivers"))) {
      const readme = readFileSync(join(root, folder, "README.md"), "utf8").toLowerCase().replace(/\s+/g, " ");
      expect(readme, folder).toContain("not tested on real hardware");
      expect(readme, folder).toContain("simulator mode only");
      expect(readme, folder).toContain("not affiliated with, certified by or endorsed by");
      expect(readme, folder).toContain("replace them with datasheet values");
    }
  });

  it("every company has both a driver and a manifest folder", () => {
    const names = (top: string): string[] => companyFolders.filter((f) => f.startsWith(top)).map((f) => f.split(/[\\/]/)[1] ?? "").sort();
    expect(names("drivers")).toEqual(names("manifests"));
  });

  it("shared driver code never names a company", () => {
    const companies = companyFolders.filter((f) => f.startsWith("drivers")).map((f) => (f.split(/[\\/]/)[1] ?? "").replace(/-/g, " "));
    for (const file of filesIn("drivers/shared")) {
      const text = readFileSync(join(root, file), "utf8").toLowerCase();
      for (const company of companies) expect(text, file).not.toContain(company);
    }
  });
});
