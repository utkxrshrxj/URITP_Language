// Works out values that are fixed before the program runs, like 10cm + 5mm = 10.5cm or 50% + 60%.
// The checker uses them to catch values out of range; later phases use them for safety limits.

import type { Expression } from "../parser/ast.js";
import { add, convert, roundTo, subtract, type Quantity } from "../stdlib/quantity.js";
import { isUnit, UNITS } from "../stdlib/units.js";

export type Constant =
  | { readonly kind: "Number"; readonly value: number }
  | { readonly kind: "Quantity"; readonly quantity: Quantity }
  | { readonly kind: "Percent"; readonly value: number };

/** Looks up the fixed value of a name, if it has one (for let x = 5cm). */
export type ConstantLookup = (name: string) => Constant | null;

/**
 * Returns the value of `expr` if it can be worked out without running the program,
 * or null if it depends on robots, sensors or anything else that is only known later.
 */
export function evaluateConstant(expr: Expression, lookup: ConstantLookup = () => null): Constant | null {
  switch (expr.kind) {
    case "Number":
      return { kind: "Number", value: expr.value };
    case "Quantity":
      return isUnit(expr.unit) ? { kind: "Quantity", quantity: { value: expr.value, unit: expr.unit } } : null;
    case "Percent":
      return { kind: "Percent", value: expr.value };
    case "Name":
      return lookup(expr.name);
    case "Unary": {
      if (expr.op !== "-") return null;
      const inner = evaluateConstant(expr.operand, lookup);
      if (inner === null) return null;
      if (inner.kind === "Quantity") {
        return { kind: "Quantity", quantity: { value: -inner.quantity.value, unit: inner.quantity.unit } };
      }
      return inner.kind === "Number" ? { kind: "Number", value: -inner.value } : null;
    }
    case "Binary": {
      if (expr.op !== "+" && expr.op !== "-") return null;
      const left = evaluateConstant(expr.left, lookup);
      const right = evaluateConstant(expr.right, lookup);
      if (left === null || right === null || left.kind !== right.kind) return null;
      const sign = expr.op === "+" ? 1 : -1;
      if (left.kind === "Quantity" && right.kind === "Quantity") {
        if (UNITS[left.quantity.unit]?.dimension !== UNITS[right.quantity.unit]?.dimension) return null;
        const quantity = expr.op === "+" ? add(left.quantity, right.quantity) : subtract(left.quantity, right.quantity);
        return { kind: "Quantity", quantity };
      }
      if (left.kind === "Number" && right.kind === "Number") return { kind: "Number", value: left.value + sign * right.value };
      if (left.kind === "Percent" && right.kind === "Percent") return { kind: "Percent", value: left.value + sign * right.value };
      return null;
    }
    case "Call": {
      // to(q, unit) and round(q, unit) with a fixed quantity.
      if (expr.callee.kind !== "Name" || (expr.callee.name !== "to" && expr.callee.name !== "round")) return null;
      const [first, second] = expr.args;
      if (first === undefined || second === undefined || second.value.kind !== "Name") return null;
      const unit = second.value.name;
      const value = evaluateConstant(first.value, lookup);
      if (value?.kind !== "Quantity" || !isUnit(unit)) return null;
      if (UNITS[unit]?.dimension !== UNITS[value.quantity.unit]?.dimension) return null;
      const quantity = expr.callee.name === "to" ? convert(value.quantity, unit) : roundTo(value.quantity, unit);
      return { kind: "Quantity", quantity };
    }
    default:
      return null;
  }
}
