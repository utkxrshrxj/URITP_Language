// Tests name scopes: binding, looking up through enclosing blocks, refusing to rebind
// in the same block (Guidebook §4), and frozen snapshots for tasks.
import { describe, expect, it } from "vitest";
import { Scope } from "../../src/checker/scope.js";
import { NUMBER, TEXT } from "../../src/checker/types.js";

const value = (line: number) => ({ kind: "value" as const, type: NUMBER, line });

describe("Scope", () => {
  it("finds names in this block and enclosing blocks", () => {
    const outer = new Scope();
    outer.define("x", value(1));
    const inner = new Scope(outer);
    inner.define("y", { kind: "value", type: TEXT, line: 2 });
    expect(inner.lookup("x")).toEqual(value(1));
    expect(inner.lookup("y")?.kind).toBe("value");
    expect(outer.lookup("y")).toBeUndefined();
  });

  it("refuses to rebind a name in the same block and returns the earlier binding", () => {
    const scope = new Scope();
    expect(scope.define("x", value(1))).toBeUndefined();
    expect(scope.define("x", value(5))).toEqual(value(1));
    expect(scope.lookup("x")).toEqual(value(1));
  });

  it("allows a nested block to bind a name used outside (DECISIONS.md D6)", () => {
    const outer = new Scope();
    outer.define("x", value(1));
    const inner = new Scope(outer);
    expect(inner.define("x", value(3))).toBeUndefined();
    expect(inner.lookup("x")).toEqual(value(3));
  });

  it("lists visible names for suggestions", () => {
    const outer = new Scope();
    outer.define("rover", value(1));
    const inner = new Scope(outer);
    inner.define("target", value(2));
    expect(inner.visibleNames().sort()).toEqual(["rover", "target"]);
  });

  it("keeps snapshots unchanged by later bindings", () => {
    const scope = new Scope();
    scope.define("a", value(1));
    const frozen = scope.snapshot();
    scope.define("b", value(2));
    expect(frozen.lookup("a")).toBeDefined();
    expect(frozen.lookup("b")).toBeUndefined();
  });
});
