# URITP grammar (version 0.1)

This is the formal grammar of URITP, written from the Guidebook (§3 lexical
structure, §5 statements, §6 site maps, §9.1 manifests). Where the Guidebook
left a choice open, the decision is in [DECISIONS.md](DECISIONS.md) and is
referenced by its number, like (B5).

The grammar comes in two levels:

1. **Lexical grammar**: how the characters of a file are cut into *tokens*
   (words, numbers, symbols) and how indentation becomes block markers.
2. **Syntax grammar**: how tokens are put together into statements and
   expressions.

## How to read the rules

The rules use a common notation called EBNF:

| Notation | Meaning |
|---|---|
| `rule = ... ;` | defines `rule` |
| `"move"` | exactly this text |
| `a b` | `a` followed by `b` |
| `a \| b` | `a` or `b` |
| `[ a ]` | `a` is optional |
| `{ a }` | `a` repeated zero or more times |
| `( a b )` | grouping |
| `UPPER_CASE` | a token made by the lexer |
| `(* ... *)` | a comment that explains the rule |

---

# Part 1: Lexical grammar

## 1.1 Files

- Every URITP file (program, site map or manifest) has the extension `.uritp`.
- Files are UTF-8. A byte-order mark at the very start is skipped.
- Lines end with `\n` or `\r\n`.

## 1.2 Comments, blank lines and spaces

- `#` starts a comment that runs to the end of the line, except inside text.
- A blank line, or a line holding only a comment, is ignored entirely,
  including for indentation.
- Spaces between tokens are ignored.
- A tab anywhere outside text and comments is an error (B5).

## 1.3 Indentation

Indentation is how URITP groups lines into blocks. The lexer turns it into
three invisible tokens:

| Token | Meaning |
|---|---|
| `NEWLINE` | one statement has ended |
| `INDENT` | a block has started |
| `DEDENT` | a block has ended |

Indentation is made of spaces only, in steps of exactly 4. The lexer keeps a
stack of open block depths, starting at `[0]`, and handles each
non-ignored line like this (B5):

1. Count the leading spaces. If a tab is found, or the count is not a
   multiple of 4, that is an error.
2. **The previous line ended with `:`.** This line must be exactly 4 spaces
   deeper than the line with the `:`. Push that depth and produce `INDENT`.
   Any other depth is an error ("expected an indented block").
3. **Otherwise, the line is exactly 4 spaces deeper than the first line of
   the current statement.** It is a *continuation line*: it is joined to the
   statement and no token is produced. Further continuation lines must be at
   that same depth.
4. **Otherwise, the depth equals the top of the stack.** Produce `NEWLINE`; a
   new statement starts.
5. **Otherwise, the depth is less than the top of the stack.** Produce
   `NEWLINE`, then pop the stack and produce one `DEDENT` for each level
   until the top equals the depth. If no level matches, that is an error
   ("this line does not line up with any block above it").
6. Any other depth is an error.

A line that ends with `:` must be the first line of its statement. A
continuation line may not end with `:` (B5).

At the end of the file the lexer produces `NEWLINE`, one `DEDENT` for every
open block, and then `EOF`.

**Example.** The `avoid` line is a continuation of `move`; the `say` line is
a new statement:

```
move rover.base to places.ward_3 speed 0.5m/s
    avoid zones.icu
say "I have arrived"
```

## 1.4 Names

```ebnf
NAME   = letter { letter | digit | "_" } ;   (* and not a keyword *)
letter = "a" ... "z" | "A" ... "Z" | "_" ;
digit  = "0" ... "9" ;
```

Names use ASCII letters only (B1). Examples: `arm`, `pick_and_place`,
`box_231`, `_tmp`. Dotted names such as `arm.tool` are not single tokens:
they are a `NAME`, a `.` and another `NAME`, joined by the syntax grammar.

## 1.5 Keywords

Keywords are reserved words. They are lower case and case-sensitive (B2).

**Reserved in every file** (§3):

```
robot connect let task return move to by speed tolerance via avoid drive
turn forward backward grip open close pick place using onto on pour from
into weld along spray amount current takeoff land at capture save as say
lang confirm ask alert log wait until timeout if elif else and or not for
in repeat every times forever break parallel fail safety when stop
return_home native import true false define force
```

**Reserved only in manifest files** (§3, B2):

```
manifest uritp frame actuator sensor profiles extension
```

A file is a manifest file when its first statement starts with `manifest`.

Some keywords may also be used as names in a few exact places (B7): as
named-argument labels (`current=180A`), as extension parameter names in
manifests, as actuator state names (`states [open, closed]`), as sensor
names in manifests (`sensor force: wrench`) and as language codes
(`lang or` for Odia).

## 1.6 Numbers, quantities and percents

```ebnf
NUMBER   = digits [ "." digits ] ;
digits   = digit { digit } ;
QUANTITY = NUMBER unit ;          (* no space between number and unit *)
PERCENT  = NUMBER "%" ;           (* no space between number and % *)
unit     = "mm" | "cm" | "m" | "km"
         | "deg" | "rad"
         | "ms" | "s" | "min" | "h"
         | "mm/s" | "cm/s" | "m/s" | "km/h"
         | "deg/s" | "rad/s"
         | "g" | "kg"
         | "N"
         | "A"
         | "ml" | "l"
         | "deg_c" ;
```

How the lexer reads a unit (B4):

- After a number, it reads every letter and `_` that follows with no space,
  plus one optional `/` and more letters. That whole piece is the unit.
- The unit must be one of the units above, spelled exactly.
- An unknown unit is an error that suggests the closest real unit, for
  example `5mms` gets "did you mean `5mm/s`?"
- A number followed by a space and a unit (`10 cm`) is an error that
  suggests `10cm`.

There are no negative literals: `-2` is unary minus applied to `2` (B3).
The full unit table, with SI values, is in
[TYPES_AND_UNITS.md](TYPES_AND_UNITS.md).

## 1.7 Text

```ebnf
TEXT       = '"' { text_char | insertion } '"' ;
text_char  = (* any character except  "  {  }  and the end of the line *) ;
insertion  = "{" NAME { "." NAME } "}" ;
```

- Text stays on one line and has no escape sequences (B6).
- `{name}` or `{a.b.c}` inserts a value, for example
  `"Hot spot at {checkpoint.name}"`.
- A `{` always starts an insertion, and a `}` outside an insertion is an
  error.
- **Constant text** is text with no insertions. Some places require it
  (B6): `connect`, `import`, `native`, `.has`, `.sense` and the manifest name.

## 1.8 Symbols

```
(  )  [  ]  ,  :  .  =  +  -  ==  !=  <  <=  >  >=
```

`<` and `>` are also used inside manifest types like `Quantity<Current>`.

## 1.9 Token list

The lexer produces these tokens:

- `NAME`, each keyword, `NUMBER`, `QUANTITY`, `PERCENT`, `TEXT`
- each symbol
- `NEWLINE`, `INDENT`, `DEDENT`, `EOF`

Every token remembers its line and column so error messages can point at it.

---

# Part 2: Syntax grammar for programs

## 2.1 Programs and blocks

```ebnf
program        = { top_statement } [ on_fail ] EOF ;

top_statement  = robot_stmt | task_def | import_stmt | define_stmt
               | safety_block | statement ;

block          = ":" NEWLINE INDENT statement { statement } [ on_fail ] DEDENT ;

on_fail        = "on" "fail" block ;
```

- A block needs at least one statement.
- `on fail:` is optional and must be the last item in its block (C6). It
  lines up with the statements of the block it protects (A8).
- `return` and `break` are part of `statement` everywhere in the grammar, but
  section 2.9 limits where they may actually appear.

## 2.2 Statements

```ebnf
statement      = simple_stmt NEWLINE | compound_stmt ;

simple_stmt    = let_stmt | return_stmt | call_stmt
               | move_stmt | drive_stmt | turn_stmt | takeoff_stmt
               | land_stmt | stop_stmt
               | grip_stmt | pick_stmt | place_stmt | pour_stmt
               | weld_stmt | spray_stmt
               | capture_stmt | log_stmt | alert_stmt
               | say_stmt | confirm_stmt
               | break_stmt | wait_stmt | native_stmt ;

compound_stmt  = if_stmt | for_stmt | repeat_stmt | parallel_stmt ;
```

Each statement below lists the Guidebook form it implements. Upper-case
words in quotes are §5's placeholders.

## 2.3 Program structure (§5)

```ebnf
(* robot NAME = connect("ADDRESS") *)
robot_stmt     = "robot" NAME "=" "connect" "(" TEXT ")" NEWLINE ;

(* let NAME = EXPR, and  let x = ask "QUESTION" [lang CODE] *)
let_stmt       = "let" NAME "=" ( expression | ask_expr ) ;
ask_expr       = "ask" TEXT [ lang_clause ] ;
lang_clause    = "lang" ( NAME | keyword ) ;   (* e.g. lang hi, lang or (B7) *)

(* task NAME(PARAMS): block *)
task_def       = "task" NAME "(" [ NAME { "," NAME } ] ")" block ;

(* return [EXPR] *)
return_stmt    = "return" [ expression ] ;

(* import "FILE.uritp" *)
import_stmt    = "import" TEXT NEWLINE ;

(* NAME(ARGS): runs a task, built-in function or extension *)
call_stmt      = postfix ;       (* must end in a call (C3) *)
```

- The text in `connect` and `import` must be constant (B6).
- `ask` is only allowed here, as the whole right-hand side of `let` (C4).
- A call statement starts with a name, for example
  `pick_and_place(cup, tray)` or `examplecorp.adaptive_weld(route.seam, current=180A)`.
  If the line does not end in a call, the parser reports that only calls can
  stand alone.

## 2.4 Motion (§5)

```ebnf
(* move FRAME to TARGET [speed Q] [tolerance Q] [via ROUTE]
       + optional avoid ZONE line *)
move_stmt      = "move" expression "to" expression { move_option } ;
move_option    = "speed" expression
               | "tolerance" expression
               | "via" expression
               | "avoid" expression ;

(* drive FRAME forward/backward [by Q] [speed Q] *)
drive_stmt     = "drive" expression ( "forward" | "backward" ) { drive_option } ;
drive_option   = "by" expression | "speed" expression ;

(* turn FRAME by ANGLE [speed Q] *)
turn_stmt      = "turn" expression "by" expression [ "speed" expression ] ;

(* takeoff ROBOT to HEIGHT *)
takeoff_stmt   = "takeoff" expression "to" expression ;

(* land ROBOT [at PLACE] *)
land_stmt      = "land" expression [ "at" expression ] ;

(* stop ROBOT *)
stop_stmt      = "stop" expression ;
```

- Optional clauses may come in any order. Each may appear once, except
  `avoid`, which may repeat (C2).
- `avoid` may sit on the same line or on a continuation line (B5).

## 2.5 Manipulation (§5)

```ebnf
(* grip ACTUATOR open/close [force Q] *)
grip_stmt      = "grip" expression ( "open" | "close" ) [ "force" expression ] ;

(* pick OBJECT using ROBOT [onto FRAME] *)
pick_stmt      = "pick" expression "using" expression [ "onto" expression ] ;

(* place OBJECT on TARGET using FRAME *)
place_stmt     = "place" expression "on" expression "using" expression ;

(* pour from OBJECT into OBJECT until CONDITION *)
pour_stmt      = "pour" "from" expression "into" expression "until" expression ;

(* weld along PATH speed Q current Q *)
weld_stmt      = "weld" "along" expression "speed" expression "current" expression ;

(* spray ACTUATOR on TARGET amount Q *)
spray_stmt     = "spray" expression "on" expression "amount" expression ;
```

## 2.6 Sensing and data (§5)

```ebnf
(* capture SENSOR save as "FILE" *)
capture_stmt   = "capture" expression "save" "as" TEXT ;

(* log EXPR, EXPR, ... *)
log_stmt       = "log" expression { "," expression } ;

(* alert "TEXT" *)
alert_stmt     = "alert" TEXT ;
```

`ROBOT.sense("SENSOR")` is listed under sensing in §5 but returns a value,
so it is an expression (section 2.10).

## 2.7 Talking to people (§5)

```ebnf
(* say "TEXT" [lang CODE] *)
say_stmt       = "say" TEXT [ lang_clause ] ;

(* confirm "QUESTION" [lang CODE] *)
confirm_stmt   = "confirm" TEXT [ lang_clause ] ;
```

`ask` is in section 2.3, since it only appears inside `let`.

## 2.8 Control flow, errors and safety (§5)

```ebnf
(* if COND: block, then optional elif COND: and else: *)
if_stmt        = "if" expression block
                 { "elif" expression block }
                 [ "else" block ] ;

(* for NAME in LIST: block *)
for_stmt       = "for" NAME "in" expression block ;

(* repeat N times: / repeat every Q: / repeat forever: *)
repeat_stmt    = "repeat" ( expression "times" | "every" expression | "forever" ) block ;

(* break *)
break_stmt     = "break" ;

(* wait Q / wait until COND [timeout Q] *)
wait_stmt      = "wait" ( "until" expression [ "timeout" expression ] | expression ) ;

(* parallel: block *)
parallel_stmt  = "parallel" block ;

(* safety: block of rules;  ACTION when COND *)
safety_block   = "safety" ":" NEWLINE INDENT safety_rule { safety_rule } DEDENT ;
safety_rule    = safety_action "when" expression NEWLINE ;
safety_action  = "stop" expression
               | "return_home" expression
               | "land" expression [ "at" expression ]
               | "alert" TEXT ;

(* native("LANGUAGE", "CODE") *)
native_stmt    = "native" "(" TEXT "," TEXT ")" ;
```

- `on fail` is in section 2.1, because it is part of a block.
- Safety rules name their robot (C9), for example
  `return_home drone when drone.battery < 25%`.
- The text in `native(...)` must be constant (B6).

## 2.9 Where statements may appear (C6)

| Statement | Allowed in |
|---|---|
| `robot`, `task`, `import`, `define`, `safety:` | top level only |
| `return` | inside a task only, and not inside `parallel:` |
| `break` | inside a `for` or `repeat` loop only, and not inside `parallel:` |
| `on fail:` | as the last item of any block, including the top level |
| everything else | anywhere a statement is allowed |

These rules are checked by the parser after it reads a statement, so the
error can say *why* the statement is in the wrong place.

## 2.10 Expressions

From loosest to tightest binding:

| Level | Operators | Example |
|---|---|---|
| 1 | `or` | `a or b` |
| 2 | `and` | `a and b` |
| 3 | `not` | `not rover.tray.loaded` |
| 4 | `==  !=  <  <=  >  >=` (no chaining) | `distance < 20cm` |
| 5 | `+  -` | `10cm + 5mm` |
| 6 | unary `-` | `-5cm` |
| 7 | `.name`, `(...)` call | `rover.sense("thermal").max` |

```ebnf
expression     = or_expr ;
or_expr        = and_expr { "or" and_expr } ;
and_expr       = not_expr { "and" not_expr } ;
not_expr       = "not" not_expr | comparison ;
comparison     = additive [ compare_op additive ] ;
compare_op     = "==" | "!=" | "<" | "<=" | ">" | ">=" ;
additive       = unary { ( "+" | "-" ) unary } ;
unary          = "-" unary | postfix ;
postfix        = primary { "." NAME | "(" [ arguments ] ")" } ;
primary        = NUMBER | QUANTITY | PERCENT | TEXT
               | "true" | "false"
               | NAME
               | list
               | "(" expression ")"
               | "to" "(" arguments ")" ;      (* the built-in to(q, unit) (B7) *)
list           = "[" [ expression { "," expression } ] "]" ;
arguments      = argument { "," argument } ;
argument       = expression
               | label "=" expression ;        (* named argument *)
label          = NAME | keyword ;              (* e.g. current=180A (B7) *)
```

- Named arguments come after positional ones (C7).
- Only a name or a dotted name can be called: `pose(...)`,
  `obj.above(10cm)`, `rover.sense("x")`.
- An expression ends at the first token that cannot continue it. That is
  why `move arm.tool to cup.above(10cm) speed 0.2m/s` needs no punctuation:
  the target expression stops at the keyword `speed`.

## 2.11 A worked example

This program (example i, cleaned up as in A8):

```
robot arm = connect("sim:panda")
task pick_and_place(obj, dest):
    move arm.tool to obj.above(10cm)
    grip arm.gripper close
    move arm.tool to dest.above(10cm) speed 0.2m/s
    grip arm.gripper open
    on fail:
        say "I couldn't complete that"
pick_and_place(cup, tray)
```

is read as:

```
program
├── robot_stmt      arm = connect("sim:panda")
├── task_def        pick_and_place(obj, dest)
│   ├── move_stmt   arm.tool -> obj.above(10cm)
│   ├── grip_stmt   arm.gripper close
│   ├── move_stmt   arm.tool -> dest.above(10cm), speed 0.2m/s
│   ├── grip_stmt   arm.gripper open
│   └── on_fail
│       └── say_stmt "I couldn't complete that"
└── call_stmt       pick_and_place(cup, tray)
```

---

# Part 3: Site maps and manifests

## 3.1 Site maps (§6)

A site map is an ordinary `.uritp` file that holds only `define` lines and
comments (D16). It names the places, zones and routes of one site.

```ebnf
site_map       = { define_stmt } EOF ;

(* define place NAME = EXPR, define zone NAME = EXPR, define route NAME = EXPR *)
define_stmt    = "define" ( "place" | "zone" | "route" ) NAME "=" expression NEWLINE ;
```

- A place is a pose.
- A zone is `polygon(...)` with three or more poses.
- A route is a list of places or poses.

Once loaded, they are used as `places.NAME`, `zones.NAME` and `route.NAME`.
(`route` is singular, exactly as the Guidebook writes it.) `define` is used
instead of `place` so it never clashes with the `place` statement.

```
define place kitchen = pose(4.2m, 1.0m, 0m, yaw=90deg)
define place door    = pose(0m, 3.5m, 0m)
define zone icu      = polygon(pose(10m, 0m, 0m), pose(14m, 0m, 0m),
    pose(14m, 6m, 0m), pose(10m, 6m, 0m))
define route night_patrol = [places.kitchen, places.door]
```

The long `define zone` line is split with a continuation line (B5).

## 3.2 Manifests (§9.1)

A manifest describes one robot model: its frames, actuators, sensors,
profiles, extensions and safety limits.

```ebnf
manifest_file  = "manifest" TEXT ":" NEWLINE
                 INDENT manifest_entry { manifest_entry } DEDENT EOF ;

manifest_entry = ( uritp_entry | frame_entry | actuator_entry | sensor_entry
                 | profiles_entry | extension_entry | safety_entry ) NEWLINE ;

(* uritp VERSION *)
uritp_entry    = "uritp" NUMBER ;

(* frame NAME: TYPE [reach Q] [max_speed Q] [payload Q] *)
frame_entry    = "frame" NAME ":" frame_type { frame_option } ;
frame_type     = "pose2d" | "pose3d" | "pose6d" ;
frame_option   = "reach" QUANTITY | "max_speed" QUANTITY | "payload" QUANTITY ;

(* actuator NAME: states [LIST] [max_force Q] *)
actuator_entry = "actuator" NAME ":" "states" "[" state { "," state } "]"
                 [ "max_force" QUANTITY ] ;
state          = NAME | keyword ;               (* e.g. open (B7) *)

(* sensor NAME: KIND [dimension D] *)
sensor_entry   = "sensor" sensor_name ":" NAME [ "dimension" dimension ] ;
sensor_name    = NAME | keyword ;               (* e.g. force (B7) *)
dimension      = "Length" | "Angle" | "Time" | "Speed" | "AngularSpeed"
               | "Mass" | "Force" | "Current" | "Volume" | "Temperature" ;

(* profiles [LIST] *)
profiles_entry = "profiles" "[" profile { "," profile } "]" ;
profile        = "core" | "navigation" | "manipulation" | "flight"
               | "legged" | "speech" | "vision" | "tooling" ;

(* extension VENDOR.NAME(PARAM: TYPE, ...) *)
extension_entry = "extension" NAME "." NAME
                  "(" [ ext_param { "," ext_param } ] ")" ;
ext_param      = label ":" type ;
type           = NAME [ "<" type ">" ] ;        (* e.g. Route, Quantity<Current> *)

(* safety max_speed Q / safety forbidden_zone ZONE *)
safety_entry   = "safety" ( "max_speed" QUANTITY | "forbidden_zone" expression ) ;
```

Words such as `pose6d`, `reach`, `max_speed`, `states` and `dimension` are
ordinary names that only have a special meaning in these positions.

Rules the parser checks after reading a manifest:

| Entry | How many |
|---|---|
| `uritp` | exactly one, and the version is `0.1` |
| `profiles` | exactly one, and it includes `core` (§9.1) |
| `frame`, `actuator`, `sensor`, `extension` | any number; names unique within each kind (a frame and an actuator may share a name, D8) |
| `safety` | any number |

- Each `frame_option` may appear once per frame.
- `forbidden_zone` takes `zones.NAME` or a `polygon(...)` (D19).
- The manifest name must be constant text (B6).

The Guidebook's example manifest:

```
manifest "ExampleCorp X7 Arm":
    uritp 0.1
    frame tool: pose6d reach 0.85m max_speed 1.5m/s payload 5kg
    actuator gripper: states [open, closed] max_force 140N
    sensor camera: rgb
    sensor force: wrench
    profiles [core, manipulation, vision]
    extension examplecorp.adaptive_weld(seam: Route, current: Quantity<Current>)
    safety max_speed 1.5m/s
```

> Note: `sensor force: wrench` names a sensor `force`, but `force` is
> reserved in every file (§3). Sensor names may be keywords (B7), so the
> Guidebook's own example stays valid. In a program, that sensor is reached
> with `robot.sense("force")`, which uses text, so no clash arises.
