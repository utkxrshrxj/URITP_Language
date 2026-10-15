# Design decisions

This file records every place where we had to choose how URITP behaves:

- where an example program disagrees with the Guidebook (the Guidebook wins),
- where the Guidebook disagrees with itself, and
- where the Guidebook says nothing and the compiler still needs an answer.

"Guidebook" means `spec-source/URITP Guidebook - Google Docs.pdf`. Section
numbers (like §5) point into it. "Examples" means the six programs in
`spec-source/URITP - Google Docs.pdf`, numbered i to vi.

Each decision says what we chose and why. Ideas that would add something new
to the language are **not** adopted; they are listed at the end under
"Proposed, not adopted" so they can be discussed later.

**General rule.** When the Guidebook is silent and an example shows a
sensible use that fits the rest of the Guidebook, we follow the example. When
the Guidebook is silent and nothing shows the way, we pick the strictest
reading that still lets the examples work, because a robot language should
reject a doubtful program rather than guess.

---

## A. Examples that disagree with the Guidebook

### A1. `disp` becomes `say`
- **Conflict:** Example ii (and the project brief) uses `disp "..."`. The
  Guidebook has no `disp`; showing or speaking a message is `say "TEXT"`
  (§5, Talking to people), which "speaks or displays a message".
- **Decision:** Use `say`. `disp` is not a keyword and is reported as an
  unknown statement, with the fix "use `say`".
- **Note:** `say` needs the `speech` profile, so the office rover in example
  ii must declare `speech` in its manifest.

### A2. `5mms` becomes `5mm/s`
- **Conflict:** Example vi writes `speed 5mms`. The Guidebook's unit table
  (§3) has `mm/s`, and §7 repeats the same line as `5mm/s`.
- **Decision:** `5mm/s`. `mms` is not a unit; the lexer reports an unknown
  unit and suggests `mm/s`.

### A3. `returnhome` becomes `return_home`
- **Conflict:** Example iii writes `returnhome`. The keyword list (§3) and
  §5 say `return_home`.
- **Decision:** `return_home`.

### A4. `cdeg` becomes `deg_c`
- **Conflict:** Example iv writes `80cdeg`. §3 says temperature uses
  `deg_c`, "so it can never be confused with the angle unit `deg`".
- **Decision:** `80deg_c`. `cdeg` is an unknown unit with the suggestion
  `deg_c`.

### A5. `places.launch_padiv` becomes `places.launch_pad`
- **Conflict:** Copying text out of the examples PDF can glue the heading of
  example iv ("iv)") onto the last word of example iii.
- **Decision:** The place is `places.launch_pad`. The `iv` is a copy
  artifact, not part of the program.

### A6. `takeoff drone(15m)` becomes `takeoff drone to 15m`
- **Conflict:** Example iii writes `takeoff drone(15m)`. §5 says
  `takeoff ROBOT to HEIGHT`.
- **Decision:** `takeoff drone to 15m`.

### A7. No comma before `speed`
- **Conflict:** Example ii writes `move rover.base to places.desk_14, speed 0.8m/s`.
  §5 has no comma: `move FRAME to TARGET [speed Q] ...`.
- **Decision:** No comma. The parser reports the comma and suggests removing it.

### A8. `on fail` lines up with the block it protects
- **Conflict:** In example i, `on fail:` is indented deeper than the line
  above it. §5 says `on fail:` comes "at the end of a block or task", and §3
  says only a line ending in `:` opens a deeper block.
- **Decision:** `on fail:` sits at the same indentation as the other
  statements of the block it protects, and is the last thing in that block.

### A9. Safety rules use `ACTION when COND`, not a `when` block
- **Conflict:** Example iii writes
  ```
  safety:
      when drone.battery < 25%:
          returnhome
  ```
  §5 defines a safety rule as `ACTION when COND` inside `safety:`.
- **Decision:** `return_home drone when drone.battery < 25%`. See C9 for why
  the robot is named.

### A10. `capture` and `save as` are one statement
- **Conflict:** Examples iii and iv put `capture drone.camera` and
  `save as "..."` on two lines at the same indentation. §5 defines one
  statement: `capture SENSOR save as "FILE"`.
- **Decision:** One statement. It can be written on one line, or with
  `save as ...` on a continuation line indented one level deeper (§3 allows
  continuation lines; see B5).

### A11. `repeat for 30min` is not URITP
- **Conflict:** Example iv writes `repeat for 30min:`. §5 only has
  `repeat N times:`, `repeat every Q:` and `repeat forever:`.
- **Decision:** Rewrite example iv with what the Guidebook has:
  ```
  repeat forever:
      for checkpoint in route.night_patrol:
          ...
      if now() >= 30min:
          break
  ```
  This finishes the current round of the patrol before stopping, which we
  say in a comment in the example. `repeat for` is listed under
  "Proposed, not adopted".

### A12. The welding seam is a route, and its start is a place
- **Conflict:** Example vi uses a bare `seam` and `seam.start`. §7 declares
  the extension parameter as `seam: Route`, routes are written `route.NAME`
  (§6), and nothing in the Guidebook defines a `.start` property or list
  indexing.
- **Decision:** The example uses `route.seam` for the seam and
  `places.seam_start` (defined in its site map) for the start point.

### A13. `counter.spot_a` becomes a place
- **Conflict:** Example v places the kettle on `counter.spot_a`. Objects only
  have the properties listed in §6 (`.handle`, `.level(N)`, `.fill`, `.id`,
  `.name` and the pose helpers); `.spot_a` is not one of them.
- **Decision:** The example uses `places.counter_spot_a`, defined in its site
  map.

---

## B. Lexical decisions (how text is cut into words)

### B1. Identifiers use ASCII letters
- **Guidebook:** "Letters, digits and `_`, not starting with a digit" (§3).
- **Decision:** "Letters" means `a`-`z` and `A`-`Z`. Any language can still be
  used inside text and comments (files are UTF-8). This keeps names portable
  to every robot controller. Unicode names are under "Proposed, not adopted".

### B2. Keywords are lower case and exact
- **Decision:** `move` is a keyword; `Move` is a plain name (and the parser
  says "keywords are written in lower case"). Units are also case-sensitive:
  `N` and `A` are upper case, `l` (litre) is lower case.
- **Manifest-only words:** §3 reserves `manifest`, `uritp`, `frame`,
  `actuator`, `sensor`, `profiles` and `extension` "in manifest files". We
  follow that literally: they are keywords only inside a manifest file. A
  file is a manifest file when its first statement starts with `manifest`.
  `define` and `force` are reserved everywhere, as §3 says.

### B3. Numbers
- **Decision:** A number is digits with an optional decimal part: `3`, `0.5`,
  `120`. Not allowed: `.5`, `5.`, `1e3`, `1_000`. A minus sign is the unary
  minus operator, so `-2` is minus applied to `2` (the result is the same).

### B4. Quantities and percents are glued to their number
- **Guidebook:** "number immediately followed by a unit, no space" (§3).
- **Decision:** After a number, any letters, `_` and one optional `/part`
  that follow without a space are read as the unit, then checked against
  the unit table (`spec/TYPES_AND_UNITS.md`). An unknown unit is an error with
  the closest real unit suggested (`mms` -> `mm/s`, `cdeg` -> `deg_c`). `10 cm`
  with a space is an error that suggests `10cm`. `25%` is a percent; `25 %`
  is an error.

### B5. Indentation, blocks and continuation lines
- **Guidebook:** a line ending in `:` opens a block indented by 4 spaces; tabs
  are an error; "a line that continues a statement (such as `avoid` under
  `move`) is indented one level deeper than the statement it belongs to" (§3).
- **Decision:**
  1. Indentation is made of spaces only, in steps of exactly 4.
  2. A tab anywhere outside text and comments is an error.
  3. After a line ending in `:`, the next line must be exactly one level
     deeper. It starts the block. Blocks always start on the next line
     (no `if x: stop r` on one line) and cannot be empty.
  4. After any other line, a line that is exactly one level deeper is a
     **continuation**: it is joined to the statement above. A statement can
     have several continuation lines, all at that same depth.
  5. A line that ends in `:` must be the first line of its statement: block
     openers cannot be split across lines. This keeps "deeper line" from
     ever meaning two things.
  6. Blank lines and comment-only lines are ignored.

### B6. Text
- **Guidebook:** double quotes; `{name}` inside inserts a value (§3).
- **Decision:**
  - Text is on one line.
  - Inside `{ }` you may write a name or a dotted name only: `{name}`,
    `{point.id}`, `{error.reason}`. No calls or arithmetic.
  - The Guidebook defines no escapes, so in v0.1 text cannot contain a
    double quote, and `{` always starts an insertion. A lone `}` is an error.
    Escapes are under "Proposed, not adopted".
  - Some places need **constant text**: text with no `{ }`. These are
    `connect(...)`, `import`, `native(...)`, `.has(...)`, `.sense(...)`,
    and the manifest name.

### B7. Keywords that are also used as names
- **Conflict:** `to` is a keyword (`move X to Y`) and also a built-in function
  `to(q, unit)` (§6). `current` is a keyword (`weld ... current Q`) and also a
  named argument in `examplecorp.adaptive_weld(seam, current=180A)` (§7).
  `open` is a keyword and also an actuator state in `states [open, closed]` (§9.1).
  `force` is a keyword and also the name of a sensor in the §9.1 example
  manifest (`sensor force: wrench`).
- **Decision:**
  - `to` followed directly by `(` where a value is expected is the built-in
    function.
  - Named-argument labels (`current=`), extension parameter names in
    manifests, actuator state names and sensor names in manifests may be
    keywords. A sensor named with a keyword is reached in a program with
    `.sense("force")`, which uses text, so no clash arises.
  - A `lang` code may be a keyword too, because some real language codes
    are: `or` is Odia and `as` is Assamese. So `say "..." lang or` is valid.
  - Everywhere else, keywords cannot be used as names.

---

## C. Syntax decisions (how words form statements)

### C1. Operators
- **Guidebook:** shows `+` (§3), `<`, `>`, `>=` (§4, examples), and the keywords
  `and`, `or`, `not`.
- **Decision:**
  - The operators are `+ -`, unary `-`, `== != < <= > >=`, and `and or not`,
    plus `( )` for grouping. `==` and `!=` are needed to compare text such as
    `rover.state == "idle"`, and `<=` belongs with the others shown.
  - Comparisons do not chain: `a < b < c` is an error.
  - `*` and `/` are not in the Guidebook and are not adopted. Text is joined
    with `{ }` insertion, not `+`.

### C2. Optional clauses can come in any order
- **Decision:** Optional clauses (`speed`, `tolerance`, `via`, `avoid` on
  `move`; `by` and `speed` on `drive`) may come in any order. Each may appear
  at most once, except `avoid`, which may repeat to avoid several zones.
  Required parts keep the order shown in §5 (for example `weld along PATH
  speed Q current Q`).

### C3. Only calls can stand alone as statements
- **Decision:** A line that starts with a name must be a call (§5 "call"),
  like `pick_and_place(cup, tray)` or `rover.sense("distance_front")`. A bare
  value such as `5cm` on its own line is an error.

### C4. `ask` only appears as `let NAME = ask ...`
- **Guidebook:** shows `let x = ask "QUESTION" [lang CODE]`.
- **Decision:** `ask` is allowed only as the whole right-hand side of `let`.

### C5. Messages are written as text literals
- **Decision:** `say`, `alert`, `confirm`, `ask` and `capture ... save as`
  take a text literal (with `{ }` insertions allowed), exactly as §5 shows.
  `lang` takes a language code written as a name: `lang hi`, `lang en`.

### C6. Where each statement may appear
- **Decision:**
  - Top level only: `robot`, `task`, `import`, `define` and `safety:`.
  - Only inside a task: `return`.
  - Only inside a loop: `break`.
  - Neither `return` nor `break` may be used inside `parallel:`, because
    they would leave the task or loop while the other statements of the
    `parallel:` block are still running.
  - Tasks are not nested.
  - `on fail:` must be the last item of its block. This includes the top
    level of the program, as in the §8 example.

### C7. Named arguments come after positional ones
- **Decision:** In a call, positional arguments come first, then `name=value`
  arguments: `pose(1m, 2m, 0m, yaw=90deg)`, `examplecorp.adaptive_weld(route.seam, current=180A)`.

### C8. Grouping lines: `if`, `elif`, `else`
- **Decision:** `elif` and `else` line up with their `if`. `on fail:` inside
  an `if` body belongs to that body only.

### C9. Safety rules name their robot
- **Guidebook:** "ACTION when COND", actions `stop`, `return_home`, `land`
  or `alert` (§5). It does not say which robot `return_home` applies to.
- **Decision:** Actions take the same parts as their statements, so the robot
  is always named:
  `stop ROBOT when COND`, `land ROBOT [at PLACE] when COND`,
  `return_home ROBOT when COND`, `alert "TEXT" when COND`.
  `return_home` exists only as a safety action (it has no statement form in
  §5) and needs the `flight` profile (§7).

### C10. `safety:` placement
- **Decision:** `safety:` is a top-level block. Its rules are active from that
  point until the program ends. It must come after the `robot` lines it
  mentions. A program may have more than one `safety:` block.

---

## D. Meaning decisions (names, types and running)

### D1. Places, zones and routes are core
- **Conflict:** §7 says the `navigation` profile "adds ... places and routes".
  But §7 also says core includes "the whole standard library", and §6 lists
  `places`, `zones` and `route` as namespaces "available in every program".
  Example vi moves an arm to `places.home`.
- **Decision:** Any robot may use places, zones and routes as values and
  `move` targets. The `navigation` profile adds `drive`, `turn`, `via` and
  `avoid`.

### D2. Which profile each statement needs
- **Conflict:** §5 lists `capture` under "camera sensor", but §7 puts it in
  the `vision` profile. §5 lists `weld` under "manipulation + welding tool"
  and `spray` under "actuator with spray capability"; §7 puts both in
  `tooling`.
- **Decision:**
  - `capture` needs the `vision` profile and a sensor of that name.
  - `weld` needs `manipulation` and `tooling`.
  - `spray` needs `tooling`.
  - `turn` needs any one of `navigation`, `legged` or `flight`.
  - The full list is in `spec/TYPES_AND_UNITS.md`.

### D3. Angular speed is a dimension
- **Conflict:** §3's unit table has "Angular speed" (`deg/s`, `rad/s`), but
  §4's list of dimensions leaves it out.
- **Decision:** `AngularSpeed` is a dimension. `turn ... speed` needs it.

### D4. Names nobody defined are objects
- **Guidebook:** objects like `cup` and `box_231` are "things the robot can
  perceive and act on" (§4). They are never declared, and the E2xx stage
  covers "unknown robots, frames, places, tasks" (§8), not objects.
- **Decision:**
  - A plain name that is not a variable, parameter, robot, task or built-in,
    used where an Object is allowed, means an object the robot finds at run
    time. Object positions are: `move` targets, `pick`/`place`/`pour`
    objects, task arguments, `.analyse(...)`, `distance(...)`, and in front
    of a pose helper or object property.
  - If the robot cannot find it, the task fails at run time (R7xx).
  - To catch typos, an unknown name that is one or two letters away from a
    name already in scope is an E2xx error with "did you mean ...?".
  - A name the program binds somewhere else (for example a loop variable
    used after its loop has ended) is never taken for an object. It is an
    E2xx error that says where the name was defined.
  - An unknown name anywhere else is E2xx.

### D5. Tasks
- **Decision:**
  - A task must be defined above the line that calls it. This also means a
    task cannot call itself, so there are no endless task loops.
  - Parameters have no written types (§5 shows `task NAME(PARAMS):`). The
    checker checks the task body once for every call, using the types of
    that call's arguments. This works because the runner expands tasks
    before anything reaches the robot (§9.2).

### D6. Names and rebinding
- **Guidebook:** "rebinding the same name in the same block is an error" (§4).
- **Decision:**
  - We follow §4 exactly: binding the same name twice in one block is an
    error. A nested block may bind a name that an outer block also uses.
  - A `for` loop variable is a fresh name in each round.
  - Robots, tasks and top-level `let`s share one set of names.
  - Built-in names cannot be redefined: `places`, `zones`, `route`, `field`,
    `shelf`, `error`, `pose`, `polygon`, `distance`, `now`, `len`, `round`,
    `text`. (The Guidebook's §4 text uses `distance < 20cm` as an example
    value; in a program that value needs another name, such as `gap`,
    because `distance` is the built-in function `distance(a, b)`.)

### D7. Places have a name and an id
- **Guidebook:** `.id` and `.name` are listed as object properties (§6).
  Examples iii and iv use `point.id` and `checkpoint.name` on places taken
  from a route.
- **Decision:** A place also has `.name` and `.id`. Both are the Text name
  it was given in `define place`. A plain pose has neither.

### D8. Hands and grippers
- **Guidebook:** `grip` "opens or closes a gripper or hand"; humanoid hands
  are also frames (§2).
- **Decision:**
  - A manifest may declare a frame and an actuator with the same name (for
    example `left_hand`). `move` uses the frame and `grip` uses the actuator.
  - `grip X open` sets state `open`, and `grip X close` sets state `closed`,
    matching the §9.2 example `ACTUATE actuator=gripper state=closed`.

### D9. Time values
- **Guidebook:** `now()` is "current time"; readings have `.timestamp`.
- **Decision:** Both are a Time quantity counted from the start of the
  program, so `now() >= 30min` and comparisons between timestamps work.

### D10. Reading types come from the manifest
- **Decision:**
  - A sensor declared with `dimension D` gives readings whose `.value`,
    `.max`, `.min` and `.mean` are `Quantity<D>`.
  - A sensor without a dimension gives plain Numbers.
  - `.timestamp` is Time.
  - `.analyse(OBJECT)` (vision profile) returns a result whose `.label` and
    `.health` are Text. The Guidebook gives these fields no types, and Text
    cannot be mixed up with a measurement.

### D11. Actuator properties
- **Guidebook:** lists `gripper.holding`, `tray.loaded` and `drawer.locked`
  as Bool (§6), but a manifest cannot say which actuator has which.
- **Decision:** `.holding`, `.loaded` and `.locked` are accepted on any
  actuator. If the robot cannot report one, the read fails at run time
  (R7xx).

### D12. Percent
- **Decision:**
  - A percent literal must be from `0%` to `100%`.
  - Percent can be added to, subtracted from and compared with Percent only.
    It never mixes with Number (§4).
  - A percent worked out while the program runs (for example
    `robot.battery - 50%`) that falls outside 0% to 100% is a run-time error
    (R7xx).

### D13. How results of unit arithmetic are shown
- **Guidebook:** `10cm + 5mm` is `10.5cm` (§3).
- **Decision:** The checker works in SI units inside. When it shows a result,
  it uses the unit of the left-hand value.

### D14. SI units in instructions
- **Guidebook:** instructions use metres, seconds, radians, kilograms,
  newtons, amperes and litres (§9.2).
- **Decision:**
  - Speeds are in m/s and angular speeds in rad/s.
  - Temperatures stay in degrees Celsius: `deg_c` is URITP's only temperature
    unit, and the §9.2 list names no temperature unit.
  - Percents are sent as a fraction from 0 to 1 (so `80%` is `0.8`), the
    unit-free form, so no robot can mistake 80 for 80 metres.

### D15. `on fail`, `stop` and cancellation
- **Guidebook:** a task ends as `succeeded`, `failed(reason)` or `cancelled`
  (§2). `on fail` runs "if any task in the enclosing block fails" (§5).
  `stop` makes the task `cancelled`. A `no` to `confirm` "cancels the program
  safely".
- **Decision:**
  - When a task in a block fails, the rest of that block is skipped and its
    `on fail:` runs.
  - If `on fail:` finishes, the failure counts as handled, and the program
    continues after the block.
  - If `on fail:` itself fails, or there is no `on fail:`, the failure moves
    out to the next enclosing block. At the top, the robot stops safely and
    the program ends with the error (§8).
  - Cancelled is not failed, so `on fail:` does not run for it.
  - A `stop ROBOT` statement in the program cancels only that robot's
    current task, and the program goes on.
  - A stop from outside the program (an emergency stop, a safety rule's
    `stop`, or a `no` to `confirm`) ends the whole program as cancelled.

### D16. Site maps
- **Decision:**
  - A site map is a `.uritp` file that contains only `define` lines (and
    comments). Any program may `import` one.
  - If a file named `site.uritp` sits next to the program, it is loaded
    automatically, because §6 names it as the place where places are
    defined. Other site maps need `import`.
  - Places that a robot's own map provides are not supported in v0.1: every
    place must come from a site map.
  - `polygon(...)` takes three or more poses. A zone covers its polygon at
    every height.

### D17. `field.row(N)` and `shelf.ID`
- **Guidebook:** §6 lists these namespaces, "defined in a field map" and "a
  warehouse map", but gives no syntax for either map.
- **Decision:** Not supported in v0.1; using them is an E2xx error that says
  so. A way to define them is under "Proposed, not adopted".

### D18. Vendor extensions
- **Decision:**
  - An extension call such as `examplecorp.adaptive_weld(...)` goes to the
    one connected robot whose manifest declares it.
  - If no robot declares it, that is an E4xx error. If two or more connected
    robots declare it, that is an error, because the Guidebook gives no way
    to choose between them.
  - `.has("NAME")` takes constant text, so the checker can work out the
    answer from the manifest and tell whether an extension call is guarded
    (W601).
  - A vendor name may not be a keyword or a built-in name (§9.3 rule 8).

### D19. Manifest safety zones
- **Decision:** `safety forbidden_zone ZONE` accepts `zones.NAME` (from the
  site map loaded with the program) or a `polygon(...)` written in the
  manifest itself.

### D20. Native code and stopping time
- **Gap:**
  - §9.3 rule 9 says a robot that accepts `NATIVE` lists its languages "in
    its manifest", but §9.1 has no manifest entry for that.
  - Rule 5 says a robot obeys `STOP` "within its stated stopping time", but
    §9.1 has no entry for that either.
- **Decision:** No v0.1 driver accepts `NATIVE`, so rule 9 does not apply yet.
  A program that uses `native` gets the W6xx warning and is then rejected by
  the capability check. Each driver states its stopping time in its own
  README and driver settings (Phase 6). Manifest entries for both are under
  "Proposed, not adopted".

### D21. Error codes
- **Guidebook:** gives code ranges and a few exact codes (§8).
- **Decision:**
  - These codes keep the meaning the Guidebook shows:
    - E101: expected `:`
    - E203: robot has no such frame
    - E304: expected a quantity, got a bare number
    - E401: command needs a profile the robot lacks
    - E502: speed over the safety limit
    - W601: extension call without a `.has` guard
    - R703: a motion failed while running
  - Other codes are assigned as each check is built and listed in
    `spec/ERRORS.md` (from Phase 2).
  - Messages follow §8: code and line, what went wrong in plain words, and a
    suggested fix.
  - Error messages may also give a column number. That is extra help, not a
    language change.

### D22. `sense` gives a Reading, `ROBOT.NAME` gives the Sensor
- **Conflict:** §4 gives `dog.sense("thermal")` as an example of the `Sensor`
  type. §5 says `sense` "returns the latest Reading", and example iv reads
  `.max` from it, which is a `Reading` property.
- **Decision:**
  - `ROBOT.sense("NAME")` returns a `Reading` (§5 and the example agree).
  - The `Sensor` itself is written `ROBOT.NAME`, as in `capture drone.camera`.

### D23. The unit in `to()` and `round()`
- **Guidebook:** shows `to(1.2m, cm)`: the unit is written as a bare word
  (§6).
- **Decision:**
  - The second value of `to()` and `round()` is a unit name written without
    quotes, and it must be a unit of the same kind as the first value.
  - Units with a `/` (`m/s`, `km/h`, `deg/s`, ...) cannot be written as a
    bare word, because `/` is not an operator. So in v0.1, `to()` and
    `round()` cannot convert to those units. A way to write them is under
    "Proposed, not adopted".

### D24. A place can go wherever a pose can
- **Decision:** A place is a named pose, so a `Place` is accepted wherever a
  `Pose` is expected (for example `distance(places.a, places.b)`). The
  opposite is not true: a plain pose has no `.name`.

### D25. What an imported file may contain
- **Guidebook:** `import` "loads tasks, places and zones from another file"
  (§5).
- **Decision:** An imported file may contain only `define`, `task` and
  `import` lines. Anything else (a `robot` line or a `move`, for example) is
  an E2xx error naming the file, because importing a file should never make
  a robot move. Each file is loaded once, and files that import each other
  in a circle are an error.

### D26. Every robot needs a manifest to be checked
- **Decision:** The checker must know each connected robot's frames,
  actuators and sensors, which come from its manifest (§9.1). A program
  that connects a robot with no manifest is rejected (E201), because
  nothing about it could be checked before it moves (§1, "check before you
  move").

### D27. Statements that name no robot
- **Gap:** `say`, `confirm`, `ask`, `pour` and `weld along` do not name a
  robot (§5), but each needs a profile (§7). With more than one connected
  robot, the Guidebook does not say which one runs them.
- **Decision:** Such a statement runs on the one connected robot that has
  the profiles it needs.
  - If no connected robot can run it, it is an error (E401 when there is
    only one robot, E404 otherwise).
  - If more than one could, it is an error (E403), because a robot program
    must never guess. This is the same rule as for extensions (D18).

### D28. `.has()` is worked out before the program runs
- **Decision:**
  - `ROBOT.has("NAME")` is answered from the manifest, so the checker knows
    which branch of `if ROBOT.has(...)` (or `if not ROBOT.has(...)`) will run.
  - A branch that can never run is still checked for names, types and
    units, but not for capabilities. So example vi is accepted on a welder
    with or without the extension, as the Guidebook intends.
  - An extension call counts as guarded (no W601) when it is inside
    `if ROBOT.has("vendor.feature"):`, alone or joined to other conditions
    with `and`.

### D29. When limits and zones are checked
- **Guidebook:** checks happen "before any motor turns" (§1), and a robot
  enforces its own limits "even if a program or instruction would break
  them" (§9.3 rule 6).
- **Decision:**
  - Speeds and forces that are fixed before the program runs (like
    `speed 3m/s`, or a `let` bound to one) are compared with the manifest:
    `safety max_speed` (E502), a frame's `max_speed` (E406) and an
    actuator's `max_force` (E407). The safety limit is reported first.
  - Fixed targets (`move`, `place ... on`, `land ... at`, and the points of a
    `via` route) are checked against the zones the manifest forbids (E501).
    Zones cover every height (D16).
  - Values only known while running (a speed worked out from a sensor, an
    object's position) and the path a robot plans between targets cannot be
    checked here. The driver enforces the same limits while running, as
    rule 6 requires (Phase 6).
  - A forbidden zone named in a manifest but missing from the site map is
    an error (E503): a zone the checker cannot locate cannot be kept out of.
  - Turning speeds have no manifest limit (see "Proposed, not adopted").

### D30. Reading robot and object values with SENSE
- **Gap:** programs read `rover.battery`, `rover.state`, `rover.pose`,
  actuator properties like `rover.tray.loaded`, and object properties like
  `mug.fill` (§6). But the instruction set (§9.2) has no instruction for any
  of these, only `SENSE sensor` for "the latest reading".
- **Decision:** all of them are read with `SENSE`, using the dotted name as
  the sensor:
  - `SENSE sensor=battery`, `SENSE sensor=state`, `SENSE sensor=pose` for
    robot properties. Every robot answers these three.
  - `SENSE sensor=tray.loaded` for an actuator property.
  - `SENSE sensor=mug.fill`, `SENSE sensor=mug.id` and `SENSE sensor=mug.pose`
    for an object the robot can perceive.
  - `SENSE sensor=camera analyse=cup` for `.analyse(cup)` (vision profile).
  - Answers use SI units, with percents as fractions (D14).
  - `.has(...)` is never sent to a robot: it is answered from the manifest
    (D28).
  - An object's properties are read by the program's robot. If several
    robots are connected, the one with the `vision` profile is asked; if
    that is still not exactly one, the read fails while running (R706).

### D36. How each statement becomes an instruction
- **Guidebook:** §9.2 lists the instructions and their fields, but not how
  every statement maps onto them.
- **Decision:**

  | Statement | Instruction |
  |---|---|
  | `move` | `MOVE frame target speed tolerance via avoid`; places are sent as poses, zones as their corners |
  | `drive` | `DRIVE frame distance speed`, with a negative distance for `backward`; with no distance, `direction=forward` or `backward` is sent instead |
  | `turn` | `TURN frame angle speed` |
  | `grip` | `ACTUATE actuator state force`, with state `open` or `closed` (D8) |
  | `pick`, `place`, `pour`, `weld`, `spray`, `takeoff`, `land`, `return_home` | `SKILL name=...` followed by its parts as fields |
  | `capture` | `SENSE sensor=NAME save="FILE"`: there is no CAPTURE instruction, so `save` is added to SENSE |
  | reading a value | `SENSE sensor=...` (D30) |
  | `say`, `confirm`, `ask` | `SAY`, `CONFIRM`, `ASK` with `text` and `lang` |
  | vendor extension | `EXT name=vendor.feature` followed by each argument under its parameter name |
  | `stop` | `STOP`, sent at once, whatever the robot is doing |

  The only additions to §9.2 are the `save` field of SENSE and the
  `direction` field of DRIVE. Each is the smallest change that lets the
  statement reach the robot.
- `pour ... until CONDITION` is checked by the robot itself, so the
  condition is sent as text with SI numbers (`until=mug.fill>=0.8`). It may
  use only objects' properties, fixed values and comparisons. Anything else
  fails while running (R705).

### D32. Who waits
- **Gap:** §5 has `wait Q` and `wait until COND [timeout Q]`, and §9.2 has a
  `WAIT` instruction, but not which robot gets it.
- **Decision:**
  - `wait Q` with exactly one connected robot is sent to it as
    `WAIT duration=Q`, so STOP and `on fail` treat it like any other task.
    With several robots, the runner waits itself; a pause in the program is
    not something one robot does.
  - `wait until COND` is worked out by the runner: it checks the condition,
    reading values with SENSE (D30), every short interval until it is true.
    The condition may use the program's own variables, which a robot
    cannot see. If the timeout passes first, the task fails with R702.

### D33. When one part of `parallel:` fails
- **Guidebook:** `parallel:` "starts every statement in the block at once
  and waits for all to finish" (§5); `on fail` runs "if any task in the
  enclosing block fails".
- **Decision:** when one statement inside `parallel:` fails, the others are
  cancelled at once and their robots are stopped, then the failure moves out
  to the enclosing block. Robots working together (for example two arms
  carrying one object) must not carry on as if nothing happened.

### D37. How safety rules are watched while running
- **Guidebook:** a `safety:` block "declares rules checked continuously
  while the program runs", and each rule triggers its action "when a
  condition becomes true" (§5).
- **Decision:**
  - Each rule is checked when the `safety:` block is reached, before every
    instruction sent to any robot, and every short interval (0.2 s by
    default) while anything is running.
  - A rule fires when its condition changes from false to true, not again
    while it stays true. A rule that is already true when it is first
    checked fires at once.
  - `alert` sends its message to the operator, and the program goes on.
  - `stop`, `return_home` and `land` stop every robot, then carry out the
    action on the named robot (STOP, `SKILL name=return_home` or
    `SKILL name=land`). The program then ends as cancelled, with the rule's
    line as the reason (D15).
  - If a rule's condition cannot be read (for example a sensor fails), the
    program is cancelled: a rule that cannot be checked cannot keep anyone
    safe.

### D38. What a URITP 0.1 driver does
- **Guidebook:** a compatible robot rejects what it cannot do exactly
  (§9.3 rule 4), obeys STOP from any state (rule 5), and enforces its own
  safety limits "even if a program or instruction would break them" (rule 6).
- **Decision:**
  - Every driver runs in **simulator mode only**. A simulated world carries
    out each instruction exactly and takes distance ÷ speed seconds. The
    driver writes the lines it would send to the real robot in that robot's
    own language, and records them. No line reaches hardware.
  - Before doing anything, a driver checks every instruction again against
    its manifest, whatever the program checker said. It refuses, with the
    reason as its failed state, anything:
    - it has no profile, part or extension for;
    - over a speed or force limit;
    - beyond its reach, or off the floor for a floor frame;
    - inside a forbidden zone;
    - finer than it can do exactly (E409, E421 to E423).
  - A target only known while running, such as an object it finds, is
    checked again as soon as it is found.
  - The simulated robots plan straight lines only. If a straight line would
    cross a zone to avoid or a forbidden zone, the task fails with that
    reason, instead of taking some other path. A `via` route can lead
    around it.
  - A driver will not start without the corners of every zone its manifest
    forbids by name.

### D39. Finding objects, and writing values in a robot's own steps
- **Guidebook:** the `manipulation` profile adds "object poses", and
  `vision` adds object detection (§7). Robots "never silently approximate"
  (§1).
- **Decision:**
  - A robot can find an object (a target like `cup`, or a property like
    `mug.fill`) only if it has the `vision` or `manipulation` profile. A
    robot with neither, like a small rover with only `core` and
    `navigation`, refuses such an instruction (E401).
  - A driver may write a value in its robot's own steps (for example whole
    millimetres or hundredths of a degree) only when the difference is
    smaller than the robot's repeatability. The robot cannot tell the two
    motions apart, so nothing is approximated. A tolerance finer than the
    repeatability is refused (E423).

### D40. How a spoken or typed request reaches a robot
- **Guidebook:** a request in any language "is converted into URITP,
  checked against the robot's manifest and the safety rules, and only then
  carried out. A spoken request can never make a robot do anything a
  written URITP program could not" (§9.4).
- **Decision:**
  - A translator only writes a program; it never moves a robot. Every
    request goes through one function, `handleRequest`: translate, then the
    same checks as a hand-written program (manifests, site map, names,
    types, units, capabilities, safety), then run. If any check fails, the
    program is rejected with its error codes and no robot receives a single
    instruction.
  - The translator is told the connected robots' parts, profiles and limits
    and the site's places, so it can avoid most mistakes. It is still never
    trusted.
  - Two translators: an offline one with fixed phrases in English, Hindi and
    Hinglish, which works without a key and refuses anything it does not
    know; and an AI one using the official Anthropic SDK with
    `claude-opus-5-5`. The AI one reads its key from the `ANTHROPIC_API_KEY`
    environment variable (`URITP_AI_MODEL` can choose another model). With
    no key it is not used, and the offline one is.
  - The AI translator asks for a fixed JSON answer
    (`understood, program, explanation, language`) and turns on the API's
    server-side refusal fallback (`fallbacks: "default"`). A refusal,
    service error or unreadable answer becomes a plain "not understood",
    never a crash.

### D41. Error messages in Hindi
- **Guidebook:** message texts are kept in translation tables, so the same
  code can be shown in English, Arabic or Hindi; codes never change between
  languages (§8).
- **Decision:**
  - Every code has an English and a Hindi message and fix, in
    `src/diagnostics/messages-en.ts` and `messages-hi.ts`. A test makes sure
    both tables cover exactly the same codes.
  - The code, the line number and URITP's own words (`move`, `on fail`,
    units, names from the program) stay the same in both languages.
  - Some details are filled into a message as they were written by the
    checker or by a robot, such as the expected word in "expected 'to'", or
    a robot's own reason for a failure. In URITP 0.1 those details stay in
    English inside a Hindi message.

### D35. Which task state sequences are valid
- **Guidebook:** a robot reports `accepted`, then `running`, then exactly
  one of `succeeded`, `failed(reason)` or `cancelled` (§9.3 rule 3). It also
  rejects an instruction it cannot perform exactly (rule 4), and obeys `STOP`
  "from any state" (rule 5).
- **Decision:** three sequences are valid:
  - `accepted, running, succeeded|failed|cancelled`: the normal case.
  - `failed` alone: the robot refused the instruction straight away, with a
    reason (rule 4). It never accepted the goal, so it never ran.
  - `accepted, cancelled`: the robot was stopped before it started (rule 5).
  - Anything else (no final state, two final states, states out of order,
    or a robot that stops answering) breaks the lifecycle. The runner then
    treats the task as failed (R704).

---

## Proposed, not adopted

These ideas came up while reading the examples and the Guidebook. None of
them is part of URITP v0.1. The compiler rejects programs that use them.

| Idea | Where it came from |
|---|---|
| `repeat for DURATION:` loop | Example iv |
| `when COND:` block form inside `safety:` | Example iii |
| `disp "TEXT"` for robots with a screen but no speech | Example ii, project brief |
| Escapes in text (`\"`, `{{`, `}}`) | Needed to write a quote or brace in a message |
| `*` and `/` arithmetic (scaling, dimension maths) | Not in the Guidebook |
| Unicode letters in names | Multilingual users |
| `define object`, `define shelf`, `define field` in site maps | D4, D17 |
| Choosing a robot for an extension call, e.g. `welder.examplecorp.adaptive_weld(...)` | D18 |
| A manifest limit for turning speed (`max_turn_speed`) | `turn ... speed` cannot be checked against a manifest limit today |
| Typed task parameters, e.g. `task f(obj: Object)` | D5 |
| Places from a robot's own map | D16 |
| List indexing or `.first` / `.last` on routes | Example vi (`seam.start`) |
| Manifest entries for actuator properties and analysis result fields | D10, D11 |
| Manifest entries for native languages and stopping time | D20 |
| Writing units with `/` in `to()`, e.g. `to(x, "km/h")` | D23 |
