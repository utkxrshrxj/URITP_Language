// Keeps track of which names exist in each block, and what they stand for.
// A name can be bound only once per block, so robot programs stay predictable (Guidebook §4).

import type { TaskStatement } from "../parser/ast.js";
import type { Type } from "./types.js";

export type Binding =
  /** A let, robot, task parameter or loop variable. */
  | { readonly kind: "value"; readonly type: Type; readonly line: number }
  /** A task, together with the names it could see where it was defined (DECISIONS.md D5). */
  | { readonly kind: "task"; readonly task: TaskStatement; readonly scope: Scope; readonly line: number };

export class Scope {
  private readonly names = new Map<string, Binding>();

  constructor(readonly parent: Scope | null = null) {}

  /**
   * Binds a name in this block. If the name is already bound in this same block,
   * nothing changes and the earlier binding is returned, so the caller can report it.
   */
  define(name: string, binding: Binding): Binding | undefined {
    const earlier = this.names.get(name);
    if (earlier !== undefined) return earlier;
    this.names.set(name, binding);
    return undefined;
  }

  /** Finds a name here or in any enclosing block. */
  lookup(name: string): Binding | undefined {
    return this.names.get(name) ?? this.parent?.lookup(name);
  }

  /** Every name visible from here, for "did you mean ...?" hints. */
  visibleNames(): string[] {
    return [...this.names.keys(), ...(this.parent?.visibleNames() ?? [])];
  }

  /** A frozen copy of everything visible now; later bindings do not show up in it. */
  snapshot(): Scope {
    const copy = new Scope(this.parent?.snapshot() ?? null);
    for (const [name, binding] of this.names) copy.names.set(name, binding);
    return copy;
  }
}
