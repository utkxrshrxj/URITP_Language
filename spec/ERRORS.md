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
| E132 | a manifest line that is not a manifest entry | `sensors camera: rgb` (did you mean `sensor`?) |

## E2xx: names (Phase 3)

| Code | Meaning | Example that triggers it |
|---|---|---|
| E201 | a robot with no manifest to check it against | `robot r = connect("x")` with no manifest given |
| E202 | a name that is not defined | `let y = targt + 1cm` (did you mean `target`?) |
| E203 | a robot has no frame with that name (§8) | `move rover.tool to ...` on a rover |
| E204 | a robot has no actuator with that name | `grip rover.gripper close` on a rover |
| E205 | a robot has no sensor with that name | `rover.sense("thermal")` |
| E206 | a robot has no part or property with that name | `log rover.colour` |
| E207 | a name bound twice in the same block (§4) | `let x = 5cm` then `let x = 6cm` |
| E208 | a built-in name redefined | `let places = 1` |
| E209 | a place, zone or route that no site map defines | `places.kitchn` (did you mean `kitchen`?) |
| E210 | a call of a task or function that does not exist | `pos(1m, 2m, 0m)` (did you mean `pose`?) |
| E211 | a property that a value does not have | `places.dock.colour` |
| E212 | a field or shelf map, not supported in URITP 0.1 | `field.row(4)` |
| E213 | an imported file that cannot be found | `import "missing.uritp"` |
| E214 | files that import each other in a circle | `a.uritp` imports `b.uritp`, which imports `a.uritp` |
| E215 | a site map or imported file holding statements it may not | `move` inside `site.uritp` |
| E216 | `error` used outside `on fail:` | `log error.reason` at the top level |

## E3xx: types and units (Phase 3)

| Code | Meaning | Example that triggers it |
|---|---|---|
| E301 | adding or subtracting values of different kinds | `10cm + 2s` |
| E302 | an operator used on a value it does not work on | `"a" + "b"`, `-25%`, `not 5` |
| E303 | comparing values of different kinds | `90deg > 80deg_c` |
| E304 | a bare number where a quantity is expected | `distance < 20` (did you mean `20cm`?) |
| E305 | a bare number where a percent is expected | `battery < 25` (did you mean `25%`?) |
| E306 | a value of the wrong kind for a slot | `pose(1m, 2m, 0m, yaw=90cm)` |
| E307 | a condition that is not true or false | `if 5:` |
| E308 | a percent outside 0% to 100% | `150%`, `60% + 50%` |
| E309 | the wrong number of values in brackets | `pose(1m, 2m)` |
| E310 | a `name=value` argument that does not exist | `pose(1m, 2m, 0m, heading=90deg)` |
| E311 | `.has()` or `.sense()` without fixed text | `rover.sense(name)` |
| E312 | `repeat N times` with N not a whole number, 0 or more | `repeat 2.5 times:` |
| E313 | a list that mixes kinds of value | `[1cm, 2s]` |
| E314 | a task that returns different kinds of value | `return 5cm` in one place, `return 2s` in another |
| E315 | a `{ }` insertion that cannot be shown as text | `"at {p}"` where `p` is a Pose |
| E316 | a `lang` code that is not a language code | `say "hi" lang english` |
| E317 | `to()` or `round()` without a unit as second value | `to(1.2m, banana)` |
| E318 | `to()` or `round()` to a unit of another kind | `to(1.2m, s)` |
| E319 | a polygon with fewer than 3 corners | `polygon(pose(...), pose(...))` |
| E320 | a task call used as a value when the task returns nothing | `let x = wave()` |

## Codes fixed by the Guidebook

These keep the meaning the Guidebook gives them (DECISIONS.md D21). They are
built in later phases, along with the other codes of their stage.

| Code | Meaning | Phase |
|---|---|---|
| E401 | a command needs a profile the robot does not have | 4 |
| E502 | a speed is above the robot's safety limit | 4 |
| W601 | a vendor extension is used without a `.has(...)` guard | 4 |
| R703 | a motion failed while running | 5 |
