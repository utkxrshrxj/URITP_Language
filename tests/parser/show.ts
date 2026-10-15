// Test helper: prints a syntax tree value in a short bracket form, like (+ 10cm 5mm).
// Makes parser tests easy to read and compare.
import type { Expression } from "../../src/parser/ast.js";

export function show(e: Expression): string {
  switch (e.kind) {
    case "Number":
    case "Quantity":
      return e.raw;
    case "Percent":
      return `${e.value}%`;
    case "Bool":
      return String(e.value);
    case "Text":
      return `"${e.parts.map((p) => (p.kind === "literal" ? p.text : `{${p.path.join(".")}}`)).join("")}"`;
    case "Name":
      return e.name;
    case "Member":
      return `${show(e.object)}.${e.name}`;
    case "Call":
      return `${show(e.callee)}(${e.args.map((a) => (a.label === null ? "" : `${a.label}=`) + show(a.value)).join(", ")})`;
    case "List":
      return `[${e.items.map(show).join(", ")}]`;
    case "Unary":
      return `(${e.op} ${show(e.operand)})`;
    case "Binary":
      return `(${e.op} ${show(e.left)} ${show(e.right)})`;
  }
}
