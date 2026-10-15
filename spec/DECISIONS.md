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
    `text`.

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
