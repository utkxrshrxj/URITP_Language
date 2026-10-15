// Writes a condition the robot checks by itself, like the "until" of pour (Guidebook §5),
// with every number in SI units: mug.fill >= 80% becomes mug.fill>=0.8.

import type { Expression } from "../parser/ast.js";
import type { Value } from "../runtime/values.js";
import { toField } from "./fields.js";
import { formatNumber, formatValue } from "./instruction.js";
import { UNITS } from "../stdlib/units.js";

/**
 * The condition as text for the robot, or null if it uses something the robot cannot check
 * itself (a call, or another robot). `lookup` gives the values of the program's own names.
 */
export function conditionText(expr: Expression, lookup: (name: string) => Value | undefined): string | null {
  switch (expr.kind) {
    case "Number":
      return formatNumber(expr.value);
    case "Quantity": {
      const info = UNITS[expr.unit];
      return info === undefined ? null : formatNumber(expr.value * info.toSI);
    }
    case "Percent":
      return formatNumber(expr.value / 100);
    case "Bool":
      return String(expr.value);
    case "Name": {
      const value = lookup(expr.name);
      if (value === undefined) return expr.name; // an object the robot finds itself
      if (value.kind === "robot" || value.kind === "part") return null;
      return formatValue(toField(value));
    }
    case "Member": {
      const owner = expr.object.kind === "Name" ? lookup(expr.object.name) : undefined;
      if (owner !== undefined) return null; // only objects' properties can be checked by the robot
      const base = conditionText(expr.object, lookup);
      return base === null ? null : `${base}.${expr.name}`;
    }
    case "Unary": {
      const inner = conditionText(expr.operand, lookup);
      if (inner === null) return null;
      return expr.op === "not" ? `not ${inner}` : `-${inner}`;
    }
    case "Binary": {
      const left = conditionText(expr.left, lookup);
      const right = conditionText(expr.right, lookup);
      if (left === null || right === null) return null;
      return expr.op === "and" || expr.op === "or" ? `${left} ${expr.op} ${right}` : `${left}${expr.op}${right}`;
    }
    default:
      return null;
  }
}
