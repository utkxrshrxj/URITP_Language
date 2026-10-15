// Describes the syntax tree: the shape of a program after parsing, one node per statement or value.
// Later stages (checker, code generator) read this tree instead of the original text.

import type { TextPart } from "../lexer/tokens.js";

/** Where a node starts in the source, so errors can point at it. */
export interface Position {
  readonly line: number;
  readonly column: number;
}

// ---------------------------------------------------------------------------
// Values (expressions), spec/GRAMMAR.md section 2.10
// ---------------------------------------------------------------------------

export interface NumberLiteral extends Position {
  readonly kind: "Number";
  readonly value: number;
  readonly raw: string;
}

export interface QuantityLiteral extends Position {
  readonly kind: "Quantity";
  readonly value: number;
  readonly unit: string;
  readonly raw: string;
}

export interface PercentLiteral extends Position {
  readonly kind: "Percent";
  readonly value: number;
}

export interface TextLiteral extends Position {
  readonly kind: "Text";
  readonly parts: readonly TextPart[];
}

export interface BoolLiteral extends Position {
  readonly kind: "Bool";
  readonly value: boolean;
}

/** A plain name such as rover, places or cup. */
export interface NameRef extends Position {
  readonly kind: "Name";
  readonly name: string;
}

/** A dotted part such as rover.base or reading.max. */
export interface MemberAccess extends Position {
  readonly kind: "Member";
  readonly object: Expression;
  readonly name: string;
}

export interface Argument extends Position {
  /** The name in a name=value argument, like "yaw" in yaw=90deg; null for a plain argument. */
  readonly label: string | null;
  readonly value: Expression;
}

/** A call such as pose(1m, 2m, 0m) or obj.above(10cm). */
export interface CallExpression extends Position {
  readonly kind: "Call";
  readonly callee: Expression;
  readonly args: readonly Argument[];
}

export interface ListLiteral extends Position {
  readonly kind: "List";
  readonly items: readonly Expression[];
}

export interface UnaryExpression extends Position {
  readonly kind: "Unary";
  readonly op: "-" | "not";
  readonly operand: Expression;
}

export type BinaryOperator = "+" | "-" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "and" | "or";

export interface BinaryExpression extends Position {
  readonly kind: "Binary";
  readonly op: BinaryOperator;
  readonly left: Expression;
  readonly right: Expression;
}

export type Expression =
  | NumberLiteral
  | QuantityLiteral
  | PercentLiteral
  | TextLiteral
  | BoolLiteral
  | NameRef
  | MemberAccess
  | CallExpression
  | ListLiteral
  | UnaryExpression
  | BinaryExpression;

/** ask "QUESTION" [lang CODE]; only allowed as the value of a let (DECISIONS.md C4). */
export interface AskExpression extends Position {
  readonly kind: "Ask";
  readonly question: TextLiteral;
  readonly lang: string | null;
}

// ---------------------------------------------------------------------------
// Blocks and programs, spec/GRAMMAR.md section 2.1
// ---------------------------------------------------------------------------

export interface Block {
  readonly statements: readonly Statement[];
  /** The on fail: handler at the end of the block, if there is one. */
  readonly onFail: OnFail | null;
}

export interface OnFail extends Position {
  readonly body: Block;
}

export interface Program extends Block {
  readonly kind: "Program";
}

// ---------------------------------------------------------------------------
// Statements, Guidebook §5 and spec/GRAMMAR.md sections 2.3 to 2.8 and 3.1
// ---------------------------------------------------------------------------

// Program structure
export interface RobotStatement extends Position {
  readonly kind: "Robot";
  readonly name: string;
  readonly address: TextLiteral;
}
export interface LetStatement extends Position {
  readonly kind: "Let";
  readonly name: string;
  readonly value: Expression | AskExpression;
}
export interface TaskStatement extends Position {
  readonly kind: "Task";
  readonly name: string;
  readonly params: readonly string[];
  readonly body: Block;
}
export interface ReturnStatement extends Position {
  readonly kind: "Return";
  readonly value: Expression | null;
}
export interface ImportStatement extends Position {
  readonly kind: "Import";
  readonly path: TextLiteral;
}
export interface CallStatement extends Position {
  readonly kind: "CallStatement";
  readonly call: CallExpression;
}

// Motion
export interface MoveStatement extends Position {
  readonly kind: "Move";
  readonly frame: Expression;
  readonly target: Expression;
  readonly speed: Expression | null;
  readonly tolerance: Expression | null;
  readonly via: Expression | null;
  readonly avoid: readonly Expression[];
}
export interface DriveStatement extends Position {
  readonly kind: "Drive";
  readonly frame: Expression;
  readonly direction: "forward" | "backward";
  readonly distance: Expression | null;
  readonly speed: Expression | null;
}
export interface TurnStatement extends Position {
  readonly kind: "Turn";
  readonly frame: Expression;
  readonly angle: Expression;
  readonly speed: Expression | null;
}
export interface TakeoffStatement extends Position {
  readonly kind: "Takeoff";
  readonly robot: Expression;
  readonly height: Expression;
}
export interface LandStatement extends Position {
  readonly kind: "Land";
  readonly robot: Expression;
  readonly at: Expression | null;
}
export interface StopStatement extends Position {
  readonly kind: "Stop";
  readonly robot: Expression;
}

// Manipulation
export interface GripStatement extends Position {
  readonly kind: "Grip";
  readonly actuator: Expression;
  readonly action: "open" | "close";
  readonly force: Expression | null;
}
export interface PickStatement extends Position {
  readonly kind: "Pick";
  readonly object: Expression;
  readonly robot: Expression;
  readonly onto: Expression | null;
}
export interface PlaceStatement extends Position {
  readonly kind: "Place";
  readonly object: Expression;
  readonly target: Expression;
  readonly frame: Expression;
}
export interface PourStatement extends Position {
  readonly kind: "Pour";
  readonly from: Expression;
  readonly into: Expression;
  readonly until: Expression;
}
export interface WeldStatement extends Position {
  readonly kind: "Weld";
  readonly path: Expression;
  readonly speed: Expression;
  readonly current: Expression;
}
export interface SprayStatement extends Position {
  readonly kind: "Spray";
  readonly actuator: Expression;
  readonly target: Expression;
  readonly amount: Expression;
}

// Sensing and data
export interface CaptureStatement extends Position {
  readonly kind: "Capture";
  readonly sensor: Expression;
  readonly file: TextLiteral;
}
export interface LogStatement extends Position {
  readonly kind: "Log";
  readonly values: readonly Expression[];
}
export interface AlertStatement extends Position {
  readonly kind: "Alert";
  readonly message: TextLiteral;
}

// Talking to people
export interface SayStatement extends Position {
  readonly kind: "Say";
  readonly message: TextLiteral;
  readonly lang: string | null;
}
export interface ConfirmStatement extends Position {
  readonly kind: "Confirm";
  readonly question: TextLiteral;
  readonly lang: string | null;
}

// Control flow
export interface IfBranch extends Position {
  readonly condition: Expression;
  readonly body: Block;
}
export interface IfStatement extends Position {
  readonly kind: "If";
  /** The if branch first, then each elif branch in order. */
  readonly branches: readonly IfBranch[];
  readonly elseBody: Block | null;
}
export interface ForStatement extends Position {
  readonly kind: "For";
  readonly variable: string;
  readonly list: Expression;
  readonly body: Block;
}
export interface RepeatStatement extends Position {
  readonly kind: "Repeat";
  readonly mode: "times" | "every" | "forever";
  /** The N in repeat N times; null for the other modes. */
  readonly count: Expression | null;
  /** The Q in repeat every Q; null for the other modes. */
  readonly interval: Expression | null;
  readonly body: Block;
}
export interface BreakStatement extends Position {
  readonly kind: "Break";
}
export interface WaitStatement extends Position {
  readonly kind: "Wait";
  readonly duration: Expression;
}
export interface WaitUntilStatement extends Position {
  readonly kind: "WaitUntil";
  readonly condition: Expression;
  readonly timeout: Expression | null;
}
export interface ParallelStatement extends Position {
  readonly kind: "Parallel";
  readonly body: Block;
}

// Errors and safety
export interface SafetyRule extends Position {
  readonly action: "stop" | "return_home" | "land" | "alert";
  /** The robot for stop, return_home and land; null for alert, or when no robot is named (D44). */
  readonly robot: Expression | null;
  /** The place in land [ROBOT] at PLACE; null otherwise. */
  readonly at: Expression | null;
  /** The message for alert; null otherwise, or when the alert has no message (D44). */
  readonly message: TextLiteral | null;
  readonly condition: Expression;
}
export interface SafetyStatement extends Position {
  readonly kind: "Safety";
  readonly rules: readonly SafetyRule[];
}
export interface NativeStatement extends Position {
  readonly kind: "Native";
  readonly language: TextLiteral;
  readonly code: TextLiteral;
}

// Site maps
export interface DefineStatement extends Position {
  readonly kind: "Define";
  readonly what: "place" | "zone" | "route";
  readonly name: string;
  readonly value: Expression;
}

export type Statement =
  | RobotStatement
  | LetStatement
  | TaskStatement
  | ReturnStatement
  | ImportStatement
  | CallStatement
  | MoveStatement
  | DriveStatement
  | TurnStatement
  | TakeoffStatement
  | LandStatement
  | StopStatement
  | GripStatement
  | PickStatement
  | PlaceStatement
  | PourStatement
  | WeldStatement
  | SprayStatement
  | CaptureStatement
  | LogStatement
  | AlertStatement
  | SayStatement
  | ConfirmStatement
  | IfStatement
  | ForStatement
  | RepeatStatement
  | BreakStatement
  | WaitStatement
  | WaitUntilStatement
  | ParallelStatement
  | SafetyStatement
  | NativeStatement
  | DefineStatement;
