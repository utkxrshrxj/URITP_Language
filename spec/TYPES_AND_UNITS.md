# Types and units (version 0.1)

This table defines the values URITP works with: the units a quantity can
have, the types the checker knows about, which operators work on which types,
and which type each part of a statement expects. It follows Guidebook §3, §4
and §9.2. Choices the Guidebook left open point to
[DECISIONS.md](DECISIONS.md).

The standard library's function signatures (`.above`, `pose`, `distance` and
so on) are written in Phase 3, together with the checker that uses them.

## 1. Dimensions and units

A **quantity** is a number glued to a unit, like `10cm` or `0.2m/s`. Every
unit belongs to one **dimension**. Quantities of the same dimension convert
automatically; different dimensions never mix.

When a program is compiled into instructions (§9.2), every quantity is
converted to the **SI unit** of its dimension, so no robot ever has to convert.

| Dimension | Units you can write | SI unit in instructions | Value of 1 unit in SI |
|---|---|---|---|
| Length | `mm` `cm` `m` `km` | metre | mm = 0.001, cm = 0.01, m = 1, km = 1000 |
| Angle | `deg` `rad` | radian | deg = π/180 ≈ 0.0174533, rad = 1 |
| Time | `ms` `s` `min` `h` | second | ms = 0.001, s = 1, min = 60, h = 3600 |
| Speed | `mm/s` `cm/s` `m/s` `km/h` | metre per second | mm/s = 0.001, cm/s = 0.01, m/s = 1, km/h = 1/3.6 ≈ 0.277778 |
| AngularSpeed | `deg/s` `rad/s` | radian per second | deg/s = π/180, rad/s = 1 |
| Mass | `g` `kg` | kilogram | g = 0.001, kg = 1 |
| Force | `N` | newton | N = 1 |
| Current | `A` | ampere | A = 1 |
| Volume | `ml` `l` | litre (as §9.2 says) | ml = 0.001, l = 1 |
| Temperature | `deg_c` | degree Celsius (D14) | deg_c = 1 |

Rules:

- Units are spelled exactly as above and are case-sensitive (B2). For
  example, `ms` is milliseconds and `m/s` is metres per second.
- `AngularSpeed` is a dimension even though §4 leaves it out of its list (D3).
- Temperature uses `deg_c`, never `deg`, so it can't be confused with an
  angle (§3).

### Common unit mistakes and what the compiler says

| You wrote | Problem | Suggestion |
|---|---|---|
| `5mms` | `mms` is not a unit | `5mm/s` |
| `80cdeg` | `cdeg` is not a unit | `80deg_c` |
| `10 cm` | space between number and unit | `10cm` |
| `2 min` | same | `2min` |
| `90Deg` | units are case-sensitive | `90deg` |
| `3L` | litre is lower case | `3l` |

## 2. Types

URITP is statically typed, but you rarely write a type: the checker works
them out (§4). Types are written with a capital letter, as in manifests
(`seam: Route`).

| Type | What it holds | How you usually get one | Example |
|---|---|---|---|
| `Number` | a plain count or ratio, no unit | a number literal | `3`, `0.5` |
| `Quantity<D>` | a number with a unit of dimension D | a quantity literal | `10cm`, `0.2m/s` |
| `Percent` | 0% to 100% | a percent literal, `.battery`, `.fill` | `25%` |
| `Bool` | true or false | `true`, `false`, a comparison, `.has(...)` | `true` |
| `Text` | a string, optionally with a language tag | a text literal | `"Hello"` |
| `Pose` | a position (x, y, z) plus orientation | `pose(...)`, pose helpers like `.above(10cm)` | `pose(1m, 2m, 0m, yaw=90deg)` |
| `Frame` | a controllable or observable frame of a robot | `ROBOT.FRAME` (from the manifest) | `arm.tool` |
| `Place` | a named pose in the site map | `places.NAME` | `places.kitchen` |
| `Zone` | a named area, used in `avoid` and safety rules | `zones.NAME`, `polygon(...)` | `zones.icu` |
| `Route` | an ordered list of places or poses | `route.NAME` | `route.night_patrol` |
| `Object` | a thing the robot can perceive and act on | a name nobody defined (D4) | `cup`, `box_231` |
| `Robot` | a connected robot | `robot NAME = connect(...)` | `rover` |
| `Actuator` | a part with discrete states | `ROBOT.ACTUATOR` (from the manifest) | `arm.gripper` |
| `Sensor` | a source of readings | `ROBOT.SENSOR` (from the manifest) | `drone.camera` |
| `Reading` | a sensor result, with a timestamp | `ROBOT.sense("NAME")` (D22) | `dog.sense("thermal")` |
| `List<T>` | an ordered list of values of type T | a list literal | `[places.a, places.b]` |
| `TaskResult` | the final state of a task | the `error` value inside `on fail:` | `error.reason` |

`D` in `Quantity<D>` is one of the ten dimensions in section 1.

Notes:

- **Move targets.** A `Pose`, `Place` or `Object` can be the target of `move`.
  An `Object` target means the object's own reference frame; helpers such as
  `.above(10cm)` give a precise pose (§4).
- **Places are poses.** A `Place` is accepted wherever a `Pose` is expected
  (D24), but a plain `Pose` has no `.name` or `.id`.
- **Routes are lists.** A `Route` can be used anywhere a list is expected, for
  example in `for point in route.roof_inspect:`. Its items are `Place`s (or
  `Pose`s, if the route was built from poses).
- **Readings.** `.value`, `.max`, `.min` and `.mean` are `Quantity<D>` when
  the manifest gives the sensor a `dimension D`, and `Number` otherwise.
  `.timestamp` is `Quantity<Time>` (D9, D10).
- **The `error` value.** Inside `on fail:`, `error` is a `TaskResult` for the
  failed task. `error.code` (for example `"R703"`) and `error.reason` are
  `Text`.
- **Time.** `now()` is a `Quantity<Time>` counted from the start of the
  program (D9).
- **Immutability.** `let` binds a value once. Binding the same name again in
  the same block is an error (§4, D6).

## 3. Operators

| Operator | Works on | Result | Errors |
|---|---|---|---|
| `a + b`, `a - b` | `Number` with `Number` | `Number` | |
| | `Quantity<D>` with `Quantity<D>` (same D) | `Quantity<D>`, shown in the unit of `a` (D13) | `10cm + 2s`: mixed dimensions |
| | `Percent` with `Percent` | `Percent` | `battery - 5`: Percent mixed with Number |
| `-a` | `Number` or `Quantity<D>` | same type | `-25%` |
| `<` `<=` `>` `>=` | two `Number`s, two `Quantity<D>` of the same D, or two `Percent`s | `Bool` | `distance < 20`: bare number where a Length is expected; `battery < 25`: Number where a Percent is expected |
| `==` `!=` | as above, plus two `Text`s or two `Bool`s | `Bool` | comparing different types |
| `and` `or` | two `Bool`s | `Bool` | |
| `not a` | `Bool` | `Bool` | |

- There is no `*` or `/` (C1).
- Comparisons do not chain.
- Text is joined by insertion: `"Hello {name}"`.
- Conditions (`if`, `elif`, `wait until`, `pour ... until`, safety `when`)
  must be `Bool`. There is no "truthy" number or text.

### Worked examples

| Expression | Result |
|---|---|
| `10cm + 5mm` | `10.5cm` |
| `1m - 20cm` | `0.8m` |
| `to(1.2m, cm)` | `120cm` |
| `30s + 2min` | `150s` |
| `distance(a, b) < 20cm` | a `Bool` |
| `battery < 25%` | a `Bool` |
| `10cm + 2s` | **error**: cannot add a Length and a Time |
| `distance < 20` | **error**: expected Length, got Number `20`. Did you mean `20cm`? |
| `battery < 25` | **error**: expected Percent, got Number `25`. Did you mean `25%`? |
| `150%` | **error**: a percent must be between 0% and 100% (D12) |

## 4. What each statement expects

When a slot needs a quantity and gets a bare number, the error suggests a unit
("expected Length, got Number '20'. Did you mean 20cm?", §8). The suggested
unit is the most common one for that dimension:

| Dimension | Suggested unit |
|---|---|
| Length | `cm` |
| Speed | `m/s` |
| Time | `s` |
| Angle | `deg` |
| AngularSpeed | `deg/s` |
| Force | `N` |
| Current | `A` |
| Volume | `ml` |
| Mass | `kg` |
| Temperature | `deg_c` |

| Statement | Slot | Expected type |
|---|---|---|
| `robot NAME = connect(...)` | address | constant `Text` |
| `move FRAME to TARGET` | FRAME | `Frame` |
| | TARGET | `Pose`, `Place` or `Object` |
| | `speed` | `Quantity<Speed>` |
| | `tolerance` | `Quantity<Length>` |
| | `via` | `Route` |
| | `avoid` | `Zone` |
| `drive FRAME forward/backward` | FRAME | `Frame` |
| | `by` | `Quantity<Length>` |
| | `speed` | `Quantity<Speed>` |
| `turn FRAME by ANGLE` | FRAME | `Frame` |
| | ANGLE | `Quantity<Angle>` |
| | `speed` | `Quantity<AngularSpeed>` |
| `takeoff ROBOT to HEIGHT` | ROBOT, HEIGHT | `Robot`, `Quantity<Length>` |
| `land ROBOT [at PLACE]` | ROBOT, PLACE | `Robot`, `Place` |
| `stop ROBOT` | ROBOT | `Robot` |
| `grip ACTUATOR open/close` | ACTUATOR | `Actuator` |
| | `force` | `Quantity<Force>` |
| `pick OBJECT using ROBOT [onto FRAME]` | OBJECT, ROBOT, FRAME | `Object`, `Robot`, `Frame` |
| `place OBJECT on TARGET using FRAME` | OBJECT, TARGET, FRAME | `Object`; `Pose`, `Place` or `Object`; `Frame` |
| `pour from A into B until COND` | A, B, COND | `Object`, `Object`, `Bool` |
| `weld along PATH speed Q current Q` | PATH, speed, current | `Route`, `Quantity<Speed>`, `Quantity<Current>` |
| `spray ACTUATOR on TARGET amount Q` | ACTUATOR, TARGET, amount | `Actuator`; `Pose`, `Place` or `Object`; `Quantity<Volume>` |
| `capture SENSOR save as "FILE"` | SENSOR | `Sensor` |
| `log EXPR, ...` | each EXPR | any type |
| `wait Q` | Q | `Quantity<Time>` |
| `wait until COND [timeout Q]` | COND, Q | `Bool`, `Quantity<Time>` |
| `if` / `elif` | condition | `Bool` |
| `for NAME in LIST` | LIST | `List<T>` or `Route` |
| `repeat N times` | N | `Number`, a whole number, 0 or more |
| `repeat every Q` | Q | `Quantity<Time>` |
| safety `stop` / `return_home` / `land` | robot | `Robot` |
| safety `when` | condition | `Bool` |
| manifest `reach` | | `Quantity<Length>` |
| manifest `max_speed` (frame and safety) | | `Quantity<Speed>` |
| manifest `payload` | | `Quantity<Mass>` |
| manifest `max_force` | | `Quantity<Force>` |

## 5. Which profile each statement needs

A robot can run a statement only if its manifest declares the profile
(§7, D1, D2). Otherwise the checker reports E401.

| Profile | Adds |
|---|---|
| `core` (every robot) | `robot`, `let`, `task`, `return`, `import`, `define`, calls, `move` (without `via`/`avoid`), `stop`, `wait`, `if`, `for`, `repeat`, `break`, `parallel`, `on fail`, `safety` with `stop` and `alert` actions, `sense`, `log`, `alert`, places, zones, routes and the rest of the standard library |
| `navigation` | `drive`, `turn`, `via`, `avoid` |
| `manipulation` | `grip`, `pick`, `place`, `pour` |
| `flight` | `takeoff`, `land`, `turn`, `return_home` |
| `legged` | `turn` and terrain-aware base goals |
| `speech` | `say`, `confirm`, `ask`, `lang` |
| `vision` | `capture`, `.analyse(...)` |
| `tooling` | `weld`, `spray` (D43) |

- `turn` is allowed with any one of `navigation`, `legged` or `flight`.
- `say`, `confirm`, `ask`, `pour` and `weld` name no robot, so they run on
  the one connected robot that has the profile (D27).
- A branch under `if ROBOT.has("NAME"):` that can never run is not checked
  for profiles (D28).
- Vendor extensions are allowed only if the manifest lists them.
- `native` is not a profile. It always gets a W6xx warning, and since no v0.1
  robot accepts it, it is then rejected (D20).

## 6. Units in instructions

Instructions sent to a robot (§9.2) carry plain numbers in SI units:

| Value in the program | Sent as |
|---|---|
| `10cm` | `0.1` (metres) |
| `90deg` | `1.5707963...` (radians) |
| `2min` | `120` (seconds) |
| `0.8m/s` | `0.8` (metres per second) |
| `5kg` | `5` (kilograms) |
| `140N` | `140` (newtons) |
| `180A` | `180` (amperes) |
| `250ml` | `0.25` (litres) |
| `80deg_c` | `80` (degrees Celsius, D14) |
| `80%` | `0.8` (fraction, D14) |
