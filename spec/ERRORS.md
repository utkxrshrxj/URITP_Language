# Error codes

Every problem the compiler reports has a code. The letter and first digit say
which stage found it (Guidebook §8):

| Codes | Stage | Catches |
|---|---|---|
| E1xx | Syntax | typos, bad indentation, missing `:` |
| E2xx | Names | unknown robots, frames, places, tasks |
| E3xx | Types and units | wrong types, mixed dimensions, bare numbers |
| E4xx | Capabilities | commands the robot cannot perform |
| E5xx | Safety | limits and zones that would be broken |
| W6xx | Portability | extensions without guards, native code (warnings) |
| R7xx | Runtime | failures while running, delivered to `on fail` |

Errors stop a program before anything moves; warnings are shown but let it
run. Each message gives the code and line, what went wrong in plain words,
and a suggested fix. Codes never change between languages, so logs stay
searchable (§8). The English wording lives in
`src/diagnostics/messages-en.ts`.

## E1xx: syntax (Phase 2)

| Code | Meaning | Example that triggers it |
|---|---|---|
| E101 | expected `:` at the end of a line that opens a block | `if x` |
| E102 | a tab character is used | a tab in the indentation |
| E103 | indentation is not a multiple of 4 spaces | `  stop rover` |
| E104 | a block is missing after a line ending in `:` | `task f():` followed by an unindented line |
| E105 | a line is indented more than expected | a block 8 spaces deeper than its `:` line |
| E106 | a line does not line up with any block above it | going back to a depth that was never used |
| E107 | a line ending in `:` does not start its own statement | a continuation line that ends in `:` |
| E110 | an unknown unit | `5mms` (did you mean `5mm/s`?) |
| E111 | a space between a number and its unit | `10 cm` |
| E112 | text with no closing `"` | `say "hello` |
| E113 | something other than a name inside `{ }` in text | `"{1 + 2}"` |
| E114 | a `}` with no matching `{` in text | `"a } b"` |
| E115 | a character that is not allowed | `;`, `*`, a non-ASCII letter in a name |
| E116 | a badly written number | `5.`, `.5` |
| E120 | expected one thing but found another | `move arm.tool cup` (expected `to`) |
| E121 | a word that is not a statement | `disp "hi"` (did you mean `say`?) |
| E122 | a value on its own line that is not a call | `rover.base` |
| E123 | a keyword used as a name | `let move = 5` |
| E124 | the same clause given twice | `speed 1m/s speed 2m/s` |
| E125 | chained comparisons | `a < b < c` |
| E126 | a plain argument after a `name=value` argument | `pose(1m, yaw=90deg, 2m)` |
| E127 | a statement in a place where it is not allowed | `return` outside a task |
| E128 | `on fail:` that is not the last thing in its block | a statement after `on fail:` |
| E129 | `ask` used anywhere but `let NAME = ask ...` | `say ask "q"` |
| E130 | `{ }` in text that must be fixed | `connect("sim:{name}")` |
| E131 | a safety rule with an action that does not exist | `returnhome drone when ...` |

## Codes fixed by the Guidebook

These keep the meaning the Guidebook gives them (DECISIONS.md D21). They are
built in later phases, along with the other codes of their stage.

| Code | Meaning | Phase |
|---|---|---|
| E203 | a robot has no frame with that name | 3 |
| E304 | a quantity was expected but a bare number was given | 3 |
| E401 | a command needs a profile the robot does not have | 4 |
| E502 | a speed is above the robot's safety limit | 4 |
| W601 | a vendor extension is used without a `.has(...)` guard | 4 |
| R703 | a motion failed while running | 5 |
