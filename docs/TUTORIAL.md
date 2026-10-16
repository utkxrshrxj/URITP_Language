# The URITP Tutorial

This tutorial teaches you URITP, the robot language in this project, one idea
at a time. You start with a two-line program that drives a rover forward. By
the end you can send robots to named places, make decisions from their
sensors, repeat work, recover when something goes wrong, keep robots safe,
describe a robot of your own and run several robots at once.

You don't need to know any other programming language. Every program in this
tutorial is in the [docs/tutorial/](tutorial/) folder, ready to run on a
simulated robot, and every output shown here is exactly what you will see.
A test in the project runs each command in this tutorial and fails if the
output ever changes, so the tutorial stays correct as URITP grows.

If you would rather understand the whole system before writing code, read
[HOW_IT_WORKS.md](HOW_IT_WORKS.md) first.

## Contents

1. [Getting started](#1-getting-started)
2. [Your first program](#2-your-first-program)
3. [Numbers and units](#3-numbers-and-units)
4. [Places, zones and routes](#4-places-zones-and-routes)
5. [Making decisions](#5-making-decisions)
6. [Repeating](#6-repeating)
7. [Tasks](#7-tasks)
8. [When things go wrong](#8-when-things-go-wrong)
9. [Safety](#9-safety)
10. [Robots describe themselves](#10-robots-describe-themselves)
11. [Several robots at once](#11-several-robots-at-once)
12. [From words to programs](#12-from-words-to-programs)
13. [Where to go next](#13-where-to-go-next)

## 1. Getting started

### 1.1 What you need

You need Node.js 20 or newer. In the project folder, install what the project
uses, then build it:

```bash
npm install
```

```bash
npm run build
```

Run `npm run build` again whenever you change the project's own code. You
don't need to build again after changing a URITP program.

### 1.2 How to run a program

Every command in this tutorial has the same shape:

```
npm run uritp -- COMMAND PROGRAM --robot MANIFEST
```

- **COMMAND** is one of three things:
  - `check` reads the program and checks it, without moving anything.
  - `compile` checks it, then lists the exact instructions the robot would get.
  - `run` checks it, then runs it on a simulated robot.
- **PROGRAM** is the `.uritp` file to use.
- **MANIFEST** is the file in which a robot describes itself: its parts, what
  it can do and its safety limits. Chapter 10 looks at one closely.

Before the program's own output, npm prints a few lines of its own that start
with `>`. This tutorial leaves them out. Use `npm run -s uritp -- ...`
(`-s` for silent) to hide them.

Simulated robots move at real speed, so a 4 metre trip at 0.2m/s takes 20
seconds. Add `--speed 10` to any `run` command to make the simulated robots
ten times faster.

### 1.3 The robots

The tutorial uses three simulated robots. Each has a manifest in the
`manifests/` folder:

| Robot | Manifest | What it can do |
|---|---|---|
| Camera rover | `manifests/raspberry-pi/pi-rover.uritp` | drive and turn, take photos, measure the distance to whatever is in front |
| Small rover | `manifests/arduino/arduino-rover.uritp` | drive and turn, measure the distance in front |
| Arm | `manifests/universal-robots/ur-arm.uritp` | move its tool, open and close its gripper |

They are named after the kind of hardware each driver is written for, but
they are **simulated only**. Nothing in this tutorial is sent to a real robot,
none of the drivers has been tested on real hardware, and the project is not
affiliated with, certified by or endorsed by any of these companies.

### 1.4 Where to experiment

The "Things to try" at the end of each chapter ask you to change programs.
Copy the tutorial's folder first, and change your copy:

```bash
cp -r docs/tutorial my-tutorial
```

Then use `my-tutorial/` instead of `docs/tutorial/` in the commands. The
tutorial's own files stay as they are, so the outputs shown here still match,
and git ignores the `my-tutorial/` folder.

## 2. Your first program

Here is a whole URITP program:

<!-- file: docs/tutorial/02-hello.uritp -->
```uritp
# My first URITP program: drive forward a little, then turn left.
robot rover = connect("lab:rover-1")

drive rover.base forward by 50cm
turn rover.base by 90deg
```

Line by line:

- A line starting with `#` is a **comment**. It is for people, and the robot
  ignores it.
- `robot rover = connect("lab:rover-1")` connects a robot and gives it the
  name `rover` in this program. The text in quotes is the robot's address.
  With simulated robots, any address works.
- `drive rover.base forward by 50cm` drives forward 50 centimetres.
  `rover.base` is the part of the robot that moves it around, its **base**.
- `turn rover.base by 90deg` turns 90 degrees. A positive angle turns left,
  and a negative one, like `-90deg`, turns right.

Run it on the camera rover:

```bash
npm run uritp -- run docs/tutorial/02-hello.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- DRIVE frame=base distance=0.5
rover -> succeeded
rover <- TURN frame=base angle=1.57079632679
rover -> succeeded
The program ended: succeeded.
```

Each `rover <- ...` line is one **instruction** sent to the robot, and the
`rover -> ...` line after it says how it ended. Notice the numbers:
`distance=0.5` is 0.5 metres, and `angle=1.57079632679` is 90 degrees in
radians. Robots always receive standard units, so no robot ever has to
convert anything (chapter 3 says more).

### 2.1 What the robot itself receives

Each kind of robot has its own language. A **driver** translates the
instructions into that language. Add `--protocol` to see what the camera
rover's driver would send:

```bash
npm run uritp -- run docs/tutorial/02-hello.uritp --robot manifests/raspberry-pi/pi-rover.uritp --protocol
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- DRIVE frame=base distance=0.5
rover -> succeeded
rover <- TURN frame=base angle=1.57079632679
rover -> succeeded
The program ended: succeeded.
Lines the rover driver would send (simulator only, not tested on real hardware):
  {"service":"motors","command":"drive","distance":0.5}
  {"service":"motors","command":"turn","angle":1.57079632679}
```

**Things to try:** in your copy of `02-hello.uritp`:

- drive `1m` instead of `50cm`;
- turn right with `-90deg`;
- add a line `drive rover.base backward by 20cm`.

## 3. Numbers and units

Every amount in URITP carries its unit, glued to the number with no space:
`50cm`, `0.2m/s`, `90deg`. A robot can never mistake centimetres for metres,
because the unit always travels with the number.

| Kind | Units you can write |
|---|---|
| Length | `mm` `cm` `m` `km` |
| Angle | `deg` `rad` |
| Time | `ms` `s` `min` `h` |
| Speed | `mm/s` `cm/s` `m/s` `km/h` |
| Turning speed | `deg/s` `rad/s` |
| Force | `N` |
| Percent | `%` |

Units are case-sensitive, so write them exactly as shown. The full list,
with mass, volume, current and temperature, is in
[spec/TYPES_AND_UNITS.md](../spec/TYPES_AND_UNITS.md).

### 3.1 Giving values a name

`let` gives a value a name, so you can use it again:

<!-- file: docs/tutorial/03-values.uritp -->
```uritp
# Values always carry their units, and let gives a value a name.
robot rover = connect("lab:rover-1")

let step = 20cm + 5mm
let slow = 10cm/s
log "one step is {step}"
drive rover.base forward by step speed slow
drive rover.base backward by step speed slow
```

```bash
npm run uritp -- run docs/tutorial/03-values.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
log: one step is 20.5cm
rover <- DRIVE frame=base distance=0.205 speed=0.1
rover -> succeeded
rover <- DRIVE frame=base distance=-0.205 speed=0.1
rover -> succeeded
The program ended: succeeded.
```

- `20cm + 5mm` is `20.5cm`. Amounts of the same kind add up, whatever their
  units, and the answer uses the unit on the left.
- `{step}` inside text puts the value of `step` there.
- `log` prints a line starting with `log:`. It is for you, not for the robot.
- `speed slow` sets how fast to drive. Without a speed, the robot chooses its
  own; the simulated rovers use 0.2m/s.

### 3.2 What the robot receives

`compile` shows the instructions without running anything:

```bash
npm run uritp -- compile docs/tutorial/03-values.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Instructions for rover (SI units):
  DRIVE frame=base distance=0.205 speed=0.1
  DRIVE frame=base distance=-0.205 speed=0.1
These are the instructions each robot would receive if every task succeeds, using the simulator's default readings.
```

`20.5cm` became `0.205` metres and `10cm/s` became `0.1` metres per second.
Driving backward became a negative distance.

### 3.3 When you make a mistake

This program has three mistakes:

<!-- file: docs/tutorial/03-mistakes.uritp -->
```uritp
# This program has three mistakes, on purpose.
robot rover = connect("lab:rover-1")

drive rover.base forward by 50
let step = 20cm + 2s
let step = 30cm
```

`check` finds all of them before anything moves:

```bash
npm run uritp -- check docs/tutorial/03-mistakes.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
E304 (line 4): expected Length, got Number '50'
  Fix: Did you mean 50cm?
E301 (line 5): cannot add Length and Time
  Fix: Both sides must be the same kind of value, like 10cm + 5mm.
E207 (line 6): 'step' is already used in this block, on line 5
  Fix: A name cannot be given a new value. Choose a different name.
3 error(s), 0 warning(s).
```

Every problem has a **code**, the **line**, what is wrong, and a **fix**:

- **E304:** `50` has no unit. It could be 50 centimetres or 50 metres, and
  guessing would be dangerous, so URITP refuses.
- **E301:** a length and a time cannot be added.
- **E207:** a name keeps its value for good. Pick a new name instead.

The first letter and number of a code tell you what kind of problem it is:

| Codes | Kind of problem |
|---|---|
| E1xx | the program is not written correctly |
| E2xx | a name is unknown or used twice |
| E3xx | wrong kind of value or unit |
| E4xx | the robot cannot do this |
| E5xx | it would break a safety limit |
| W6xx | a warning: it may not work on every robot |
| R7xx | something went wrong while running |

Every code is listed in [spec/ERRORS.md](../spec/ERRORS.md). Add `--lang hi`
to see the messages in Hindi. The codes stay the same:

```bash
npm run uritp -- check docs/tutorial/03-mistakes.uritp --robot manifests/raspberry-pi/pi-rover.uritp --lang hi
```

```text
E304 (लाइन 4): Length चाहिए था, पर सादी संख्या '50' मिली
  सुधार: क्या आपका मतलब 50cm था?
E301 (लाइन 5): Length और Time पर 'add' नहीं हो सकता
  सुधार: दोनों तरफ़ एक ही तरह का मान होना चाहिए, जैसे 10cm + 5mm।
E207 (लाइन 6): 'step' इस ब्लॉक में पहले से लाइन 5 पर इस्तेमाल हो चुका है
  सुधार: किसी नाम को नया मान नहीं दिया जा सकता। कोई दूसरा नाम चुनिए।
3 त्रुटि, 0 चेतावनी।
```

A space between a number and its unit is a mistake too:

<!-- file: docs/tutorial/03-space.uritp -->
```uritp
# A space between a number and its unit is a mistake too.
robot rover = connect("lab:rover-1")

turn rover.base by 90 deg
```

```bash
npm run uritp -- check docs/tutorial/03-space.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
E111 (line 4): there is a space between 90 and 'deg'
  Fix: Write 90deg with no space.
1 error(s), 0 warning(s).
```

**Things to try:** write `5mms` instead of `5mm/s`, or `90Deg` instead of
`90deg`, and run `check` to see what URITP suggests.

## 4. Places, zones and routes

Robots work in real buildings, and it is easier to say "the kitchen" than
"4 metres east and 1 metre north". A **site map** gives places names. This is
the one for this tutorial:

<!-- file: docs/tutorial/site.uritp -->
```uritp
# The site map for the tutorial: a small office floor. Illustrative positions only.

define place dock    = pose(0m, 0m, 0m)
define place kitchen = pose(4m, 1m, 0m)
define place desk    = pose(2m, 3m, 0m)
define place door    = pose(0m, 3.5m, 0m)
define place landing = pose(9m, 1m, 0m)
define zone stairs   = polygon(pose(8m, 0m, 0m), pose(10m, 0m, 0m),
    pose(10m, 2m, 0m), pose(8m, 2m, 0m))
define route rounds  = [places.kitchen, places.desk, places.door]
```

- `define place NAME = pose(x, y, z)` names a position. Here the dock, where
  the rover starts, is at 0, 0, 0.
- `define zone NAME = polygon(...)` names an area, given by its corners.
- `define route NAME = [...]` names a list of places, in order.
- A line that is too long can continue on the next line, indented by 4
  spaces, as the `stairs` zone does.

In a program, they are `places.kitchen`, `zones.stairs` and `route.rounds`.
URITP finds the site map by itself: it is the file called `site.uritp` next to
the program. Use `--site FILE` to choose a different one.

### 4.1 Going to a place

<!-- file: docs/tutorial/04-places.uritp -->
```uritp
# Going to named places from the site map.
robot rover = connect("lab:rover-1")

move rover.base to places.kitchen
move rover.base to places.desk speed 0.25m/s
move rover.base to places.dock
```

```bash
npm run uritp -- run docs/tutorial/04-places.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(4,1,0,0,0,0)
rover -> succeeded
rover <- MOVE frame=base target=pose(2,3,0,0,0,0) speed=0.25
rover -> succeeded
rover <- MOVE frame=base target=pose(0,0,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

`move` goes to a place, wherever the robot is now. The place became its
position in metres, `pose(4,1,0,0,0,0)`. The last three numbers are which way
it faces.

### 4.2 A misspelled place

<!-- file: docs/tutorial/04-typo.uritp -->
```uritp
# A misspelled place name.
robot rover = connect("lab:rover-1")

move rover.base to places.kitchn
```

```bash
npm run uritp -- check docs/tutorial/04-typo.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
E209 (line 4): there is no place called 'kitchn' in the site map
  Fix: Did you mean 'kitchen'?
1 error(s), 0 warning(s).
```

### 4.3 Keeping out of a zone

`avoid` keeps the robot out of a zone on the way. It can go on the same line
as `move`, or on the next line indented by 4 spaces:

<!-- file: docs/tutorial/04-avoid.uritp -->
```uritp
# Going to the kitchen while keeping out of the stairs.
robot rover = connect("lab:rover-1")

move rover.base to places.kitchen
    avoid zones.stairs
```

```bash
npm run uritp -- run docs/tutorial/04-avoid.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(4,1,0,0,0,0) avoid=[polygon((8,0),(10,0),(10,2),(8,2))]
rover -> succeeded
The program ended: succeeded.
```

The zone's corners travel with the instruction, so the robot itself can make
sure it keeps out. Chapter 8 shows what happens when it cannot.

**Things to try:** add a place of your own to your copy of `site.uritp`, like
`define place printer = pose(1m, 2m, 0m)`, and send the rover there.

## 5. Making decisions

A robot can look before it moves. `rover.sense("distance_front")` reads the
distance sensor, and `.value` is the distance it measured:

<!-- file: docs/tutorial/05-decisions.uritp -->
```uritp
# Looking before moving: the rover reads its distance sensor and decides what to do.
robot rover = connect("lab:rover-1")

let front = rover.sense("distance_front").value
log "the nearest thing in front is {front} away"
if front < 30cm:
    turn rover.base by 90deg
elif front < 1m:
    drive rover.base forward by 10cm speed 0.05m/s
else:
    drive rover.base forward by 50cm
```

```bash
npm run uritp -- run docs/tutorial/05-decisions.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- SENSE sensor=distance_front
rover -> succeeded
log: the nearest thing in front is 2m away
rover <- DRIVE frame=base distance=0.5
rover -> succeeded
The program ended: succeeded.
```

- `if CONDITION:` runs the indented lines under it only when the condition
  is true.
- `elif` ("else if") is checked only when everything above it was false, and
  `else` runs when nothing above it was true. Both are optional.
- The lines inside are indented by exactly 4 spaces. Indentation is how
  URITP knows which lines belong to the `if`.
- In the simulator, nothing is ever in front of the rover, so its distance
  sensor reads 2 metres and the `else` branch runs.

Conditions compare values of the same kind:

| Write | Meaning |
|---|---|
| `a < b`, `a <= b` | less than, less than or equal |
| `a > b`, `a >= b` | more than, more than or equal |
| `a == b`, `a != b` | equal, not equal |
| `x and y`, `x or y`, `not x` | combining conditions |

A distance compared with a bare number, like `front < 30`, is an error with
the fix "Did you mean 30cm?".

**Things to try:** change `1m` to `3m`, so the `elif` branch runs instead.

## 6. Repeating

### 6.1 A number of times

<!-- file: docs/tutorial/06-square.uritp -->
```uritp
# Drive a square: four sides, four turns.
robot rover = connect("lab:rover-1")

repeat 4 times:
    drive rover.base forward by 50cm
    turn rover.base by 90deg
```

```bash
npm run uritp -- run docs/tutorial/06-square.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- DRIVE frame=base distance=0.5
rover -> succeeded
rover <- TURN frame=base angle=1.57079632679
rover -> succeeded
rover <- DRIVE frame=base distance=0.5
rover -> succeeded
rover <- TURN frame=base angle=1.57079632679
rover -> succeeded
rover <- DRIVE frame=base distance=0.5
rover -> succeeded
rover <- TURN frame=base angle=1.57079632679
rover -> succeeded
rover <- DRIVE frame=base distance=0.5
rover -> succeeded
rover <- TURN frame=base angle=1.57079632679
rover -> succeeded
The program ended: succeeded.
```

### 6.2 Once for each place on a route

`for NAME in LIST:` runs its lines once for every item, with `NAME` standing
for the current one:

<!-- file: docs/tutorial/06-rounds.uritp -->
```uritp
# Visit every place on the rounds route and take a photo at each one.
robot rover = connect("lab:rover-1")

for point in route.rounds:
    move rover.base to point
    capture rover.camera save as "{point.name}.jpg"
move rover.base to places.dock
```

```bash
npm run uritp -- run docs/tutorial/06-rounds.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(4,1,0,0,0,0)
rover -> succeeded
rover <- SENSE sensor=camera save="kitchen.jpg"
rover -> succeeded
rover <- MOVE frame=base target=pose(2,3,0,0,0,0)
rover -> succeeded
rover <- SENSE sensor=camera save="desk.jpg"
rover -> succeeded
rover <- MOVE frame=base target=pose(0,3.5,0,0,0,0)
rover -> succeeded
rover <- SENSE sensor=camera save="door.jpg"
rover -> succeeded
rover <- MOVE frame=base target=pose(0,0,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

`point.name` is the name of the place, so each photo gets its own file name.
`capture` takes a photo: the rover does it by reading its camera, which is why
it shows up as a `SENSE` instruction.

### 6.3 Stopping early

`break` leaves the loop at once:

<!-- file: docs/tutorial/06-until-close.uritp -->
```uritp
# Creep forward in small steps, but stop as soon as something is close in front.
robot rover = connect("lab:rover-1")

repeat 5 times:
    if rover.sense("distance_front").value < 20cm:
        break
    drive rover.base forward by 10cm
```

```bash
npm run uritp -- run docs/tutorial/06-until-close.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- SENSE sensor=distance_front
rover -> succeeded
rover <- DRIVE frame=base distance=0.1
rover -> succeeded
rover <- SENSE sensor=distance_front
rover -> succeeded
rover <- DRIVE frame=base distance=0.1
rover -> succeeded
rover <- SENSE sensor=distance_front
rover -> succeeded
rover <- DRIVE frame=base distance=0.1
rover -> succeeded
rover <- SENSE sensor=distance_front
rover -> succeeded
rover <- DRIVE frame=base distance=0.1
rover -> succeeded
rover <- SENSE sensor=distance_front
rover -> succeeded
rover <- DRIVE frame=base distance=0.1
rover -> succeeded
The program ended: succeeded.
```

Nothing is ever close in the simulator, so all five steps run.

URITP has two more kinds of loop: `repeat forever:` keeps going until a
`break`, and `repeat every 10s:` runs its lines once every 10 seconds. To
pause, write `wait 2s`, or `wait until CONDITION timeout 30s` to wait until
something becomes true.

**Things to try:** make the rover drive a triangle. Each turn is `120deg`.

## 7. Tasks

### 7.1 Naming a list of steps

A **task** is a list of steps with a name, so you can use it again and again.
The names in brackets are its **inputs**:

<!-- file: docs/tutorial/07-tasks.uritp -->
```uritp
# A task is a list of steps with a name, so it can be used again and again.
robot rover = connect("lab:rover-1")

task visit(spot):
    move rover.base to spot
    capture rover.camera save as "{spot.name}.jpg"

visit(places.kitchen)
visit(places.door)
move rover.base to places.dock
```

```bash
npm run uritp -- run docs/tutorial/07-tasks.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(4,1,0,0,0,0)
rover -> succeeded
rover <- SENSE sensor=camera save="kitchen.jpg"
rover -> succeeded
rover <- MOVE frame=base target=pose(0,3.5,0,0,0,0)
rover -> succeeded
rover <- SENSE sensor=camera save="door.jpg"
rover -> succeeded
rover <- MOVE frame=base target=pose(0,0,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

`visit(places.kitchen)` runs the task with `spot` standing for the kitchen.
Words that belong to URITP itself, like `place`, `move` or `stop`, can't be
used as names. That's why the input is called `spot`.

### 7.2 A task on a robot arm

An arm works on a table instead of a building, so its programs are in their
own folder, [tutorial/arm/](tutorial/arm/), with their own site map:

<!-- file: docs/tutorial/arm/site.uritp -->
```uritp
# The site map for the arm chapter: two spots on a table, with the tool pointing down
# (roll=180deg). Illustrative positions only.

define place bin_a = pose(0.4m, 0.1m, 0.05m, roll=180deg)
define place bin_b = pose(0.3m, -0.3m, 0.05m, roll=180deg)
```

`roll=180deg` turns the tool upside down, so it points down at the table.

<!-- file: docs/tutorial/arm/07-arm.uritp -->
```uritp
# An arm moves a part from one bin to another, using a task with two inputs.
robot arm = connect("lab:arm-1")

task move_part(from_spot, to_spot):
    move arm.tool to from_spot.above(10cm) speed 0.2m/s
    move arm.tool to from_spot speed 0.1m/s
    grip arm.gripper close force 40N
    move arm.tool to to_spot.above(10cm) speed 0.2m/s
    grip arm.gripper open

move_part(places.bin_a, places.bin_b)
move_part(places.bin_b, places.bin_a)
```

- `arm.tool` is the end of the arm, where the gripper is.
- `from_spot.above(10cm)` is the same spot, 10 centimetres higher. The arm
  comes down from above, so it doesn't knock anything over.
- `grip arm.gripper close force 40N` closes the gripper, squeezing with at
  most 40 newtons.

```bash
npm run uritp -- run docs/tutorial/arm/07-arm.uritp --robot manifests/universal-robots/ur-arm.uritp --protocol
```

```text
Simulated robots only. Nothing is sent to real hardware.
arm <- MOVE frame=tool target=pose(0.4,0.1,0.15,3.14159265359,0,0) speed=0.2
arm -> succeeded
arm <- MOVE frame=tool target=pose(0.4,0.1,0.05,3.14159265359,0,0) speed=0.1
arm -> succeeded
arm <- ACTUATE actuator=gripper state=closed force=40
arm -> succeeded
arm <- MOVE frame=tool target=pose(0.3,-0.3,0.15,3.14159265359,0,0) speed=0.2
arm -> succeeded
arm <- ACTUATE actuator=gripper state=open
arm -> succeeded
arm <- MOVE frame=tool target=pose(0.3,-0.3,0.15,3.14159265359,0,0) speed=0.2
arm -> succeeded
arm <- MOVE frame=tool target=pose(0.3,-0.3,0.05,3.14159265359,0,0) speed=0.1
arm -> succeeded
arm <- ACTUATE actuator=gripper state=closed force=40
arm -> succeeded
arm <- MOVE frame=tool target=pose(0.4,0.1,0.15,3.14159265359,0,0) speed=0.2
arm -> succeeded
arm <- ACTUATE actuator=gripper state=open
arm -> succeeded
The program ended: succeeded.
Lines the arm driver would send (simulator only, not tested on real hardware):
  movel(p[0.4, 0.1, 0.15, 3.141593, 0.0, 0.0], a=1.2, v=0.2)
  movel(p[0.4, 0.1, 0.05, 3.141593, 0.0, 0.0], a=1.2, v=0.1)
  gripper_close(force=40.0)
  movel(p[0.3, -0.3, 0.15, 3.141593, 0.0, 0.0], a=1.2, v=0.2)
  gripper_open()
  movel(p[0.3, -0.3, 0.15, 3.141593, 0.0, 0.0], a=1.2, v=0.2)
  movel(p[0.3, -0.3, 0.05, 3.141593, 0.0, 0.0], a=1.2, v=0.1)
  gripper_close(force=40.0)
  movel(p[0.4, 0.1, 0.15, 3.141593, 0.0, 0.0], a=1.2, v=0.2)
  gripper_open()
```

The arm's driver writes each instruction as a line of URScript-style text,
the kind of language Universal Robots arms use.

**Things to try:** add a third spot to your copy of `arm/site.uritp` and move
the part there too.

## 8. When things go wrong

### 8.1 A robot that cannot do it

Robots in this project plan straight paths. The landing is behind the
stairs, so no straight path reaches it while keeping out of them:

<!-- file: docs/tutorial/08-no-plan.uritp -->
```uritp
# Trying to reach the stairs landing, with no plan for what to do if that fails.
robot rover = connect("lab:rover-1")

move rover.base to places.landing
    avoid zones.stairs
log "I am on the landing"
```

```bash
npm run uritp -- run docs/tutorial/08-no-plan.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(9,1,0,0,0,0) avoid=[polygon((8,0),(10,0),(10,2),(8,2))]
rover -> failed: no straight path to the target stays out of a zone to avoid
rover <- STOP
The program ended: failed.
R703 (line 4): a task failed while running: move failed: no straight path to the target stays out of a zone to avoid
  Fix: Handle it in on fail:, for example by going back to a safe place.
```

The robot refused rather than go through the stairs. Since the program had no
plan for this, URITP stopped every robot (`STOP`), ended the program as
**failed**, and said why. The line `log "I am on the landing"` never ran.

### 8.2 Having a plan: on fail

`on fail:` says what to do if anything above it fails:

<!-- file: docs/tutorial/08-on-fail.uritp -->
```uritp
# Trying to reach the stairs landing, and going back to the dock if the robot cannot.
robot rover = connect("lab:rover-1")

move rover.base to places.landing
    avoid zones.stairs
log "I am on the landing"
on fail:
    log "I could not get there: {error.reason}"
    move rover.base to places.dock
```

```bash
npm run uritp -- run docs/tutorial/08-on-fail.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(9,1,0,0,0,0) avoid=[polygon((8,0),(10,0),(10,2),(8,2))]
rover -> failed: no straight path to the target stays out of a zone to avoid
log: I could not get there: move failed: no straight path to the target stays out of a zone to avoid
rover <- MOVE frame=base target=pose(0,0,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

- `on fail:` comes last and lines up with the lines it protects.
- Inside it, `error.reason` says what went wrong, and `error.code` is its
  code, like `"R703"`.
- The failure was handled, so the program ended as **succeeded**.

A task can have its own `on fail:` as its last lines, so each task can
recover in its own way. That `on fail:` can use the task's inputs, for
example `say "I could not reach {spot.name}"` in a task `visit(spot)`. It
cannot use names the task sets with `let`, because the failure may have
happened before that line ran.

**Things to try:** make the `on fail:` block go to the kitchen instead.

## 9. Safety

A robot must never be put in danger by a program, even a wrong one. URITP
keeps robots safe in four ways.

### 9.1 Checked before anything moves

The camera rover's manifest says it must never go faster than 0.3m/s:

<!-- file: docs/tutorial/09-too-fast.uritp -->
```uritp
# Asking for more speed than the robot's safety limit allows.
robot rover = connect("lab:rover-1")

move rover.base to places.kitchen speed 1m/s
```

```bash
npm run uritp -- check docs/tutorial/09-too-fast.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
E502 (line 4): speed 1m/s exceeds safety limit 0.3m/s for 'rover'
  Fix: Use a speed of at most 0.3m/s. A program can never switch safety limits off (Guidebook §9.3 rule 6).
1 error(s), 0 warning(s).
```

`run` would refuse this program in the same way, before the robot gets
anything. No program can switch a safety limit off.

### 9.2 Watched the whole time

A `safety:` block holds rules that are checked again and again while the
program runs:

<!-- file: docs/tutorial/09-safety.uritp -->
```uritp
# A safety rule is watched the whole time the program runs.
robot rover = connect("lab:rover-1")

safety:
    stop rover when rover.battery < 20%

log "battery: {rover.battery}"
move rover.base to places.kitchen speed 0.3m/s
```

```bash
npm run uritp -- run docs/tutorial/09-safety.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- SENSE sensor=battery
rover -> succeeded
log: battery: 100%
rover <- MOVE frame=base target=pose(4,1,0,0,0,0) speed=0.3
rover -> succeeded
The program ended: succeeded.
```

The one `SENSE` shown is the program's own `log` line reading the battery.
The safety rule reads it too, before every instruction and every 0.2 seconds
while the rover drives, but those readings are not shown, so they do not
bury the program's own steps. The robot still receives them: add
`--protocol` to see every battery read the driver sends. The simulated
battery stays at 100%, so the rule never needs to act.

A rule can `stop` a robot, send a flying robot home with `return_home`, make
it `land`, or raise an `alert`. It can name its robot, as this one does, or
leave the robot out:

- `stop when rover.battery < 20%` stops every robot.
- `return_home when drone.battery < 25%` and `land when ...` go to the one
  robot that can fly.
- `alert "Battery low" when rover.battery < 30%` shows that message, and
  `alert when ...` without a message says which rule it was.

### 9.3 The robot checks too

Every driver checks every instruction against the robot's own limits, even
though URITP already checked the program. If a check were ever missed, the
robot would still refuse, just as the rover in chapter 8 refused a path it
could not take safely.

### 9.4 Stop, at any moment

Press **Ctrl+C** while a program runs. Every robot stops at once, and the
program ends as **cancelled**. Try it with `06-rounds.uritp`.

## 10. Robots describe themselves

URITP knows what each robot can do from its **manifest**. This is the camera
rover's:

<!-- file: manifests/raspberry-pi/pi-rover.uritp -->
```uritp
# Company: Raspberry Pi
# Reference manifest for a small wheeled rover built on a Raspberry Pi, run in simulator mode only.
# Written from public documentation. Values are illustrative: replace with datasheet values
# for your own motors, wheels and sensors before using it with a real robot. Not tested on real hardware.
manifest "Raspberry Pi camera rover (reference, simulated)":
    uritp 0.1
    frame base: pose2d max_speed 0.5m/s payload 1kg
    sensor camera: rgb
    sensor distance_front: ultrasonic dimension Length
    profiles [core, navigation, vision]
    safety max_speed 0.3m/s
```

- The comment lines at the top say which hardware the manifest is written
  for, and that its numbers are only examples.
- `frame base: pose2d ...` is the part that moves the robot. `pose2d` means it
  moves on the floor, and `max_speed` is how fast it can go.
- `sensor` lines list what it can measure. `dimension Length` says the
  distance sensor measures a length, so `.value` is a length like `2m`.
- `profiles` are groups of things a robot can do: `navigation` to drive and
  turn, `vision` to take photos. Every robot has `core`.
- `safety max_speed 0.3m/s` is the limit from chapter 9.

### 10.1 The same program on a different robot

`02-hello.uritp` runs unchanged on the small rover. Only its driver's
language is different:

```bash
npm run uritp -- run docs/tutorial/02-hello.uritp --robot manifests/arduino/arduino-rover.uritp --protocol
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- DRIVE frame=base distance=0.5
rover -> succeeded
rover <- TURN frame=base angle=1.57079632679
rover -> succeeded
The program ended: succeeded.
Lines the rover driver would send (simulator only, not tested on real hardware):
  F 500 200
  L 9000 2865
```

`F 500 200` means forward 500 millimetres at 200 millimetres per second, and
`L 9000 2865` means turn left 90.00 degrees at 28.65 degrees per second. The
camera rover got the same two instructions as JSON messages. This is the point
of URITP: one program, many robots.

### 10.2 A robot that cannot

The small rover has no camera, so it cannot do the rounds from chapter 6:

```bash
npm run uritp -- check docs/tutorial/06-rounds.uritp --robot manifests/arduino/arduino-rover.uritp
```

```text
E205 (line 6): robot 'rover' has no sensor 'camera'
  Fix: Its sensors are: distance_front.
1 error(s), 0 warning(s).
```

### 10.3 A robot of your own

You can describe a robot yourself. This one is made up for the tutorial: a
rover that can talk, because it has the `speech` profile:

<!-- file: docs/tutorial/my-robot.uritp -->
```uritp
# The manifest for a robot made up for this tutorial: a rover that can talk.
manifest "Talking rover (tutorial)":
    uritp 0.1
    frame base: pose2d max_speed 0.5m/s payload 1kg
    sensor distance_front: ultrasonic dimension Length
    profiles [core, navigation, speech]
    safety max_speed 0.3m/s
```

<!-- file: docs/tutorial/10-talk.uritp -->
```uritp
# A rover that tells people what it is doing, in English and in Hindi.
robot rover = connect("lab:talker-1")

say "Hello! I am going to the kitchen."
move rover.base to places.kitchen
say "मैं रसोई में पहुँच गया हूँ" lang hi
```

`say` speaks to people nearby, and `lang hi` says the text is in Hindi.

```bash
npm run uritp -- run docs/tutorial/10-talk.uritp --robot docs/tutorial/my-robot.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- SAY text="Hello! I am going to the kitchen."
rover -> succeeded
rover <- MOVE frame=base target=pose(4,1,0,0,0,0)
rover -> succeeded
rover <- SAY text="मैं रसोई में पहुँच गया हूँ" lang=hi
rover -> succeeded
The program ended: succeeded.
```

This robot has no driver of its own, so URITP shows its instructions just as
they are.

**Things to try:** remove `speech` from the `profiles` line in your copy of
`my-robot.uritp` and run `check` on `10-talk.uritp`.

## 11. Several robots at once

A program can connect more than one robot. `parallel:` runs its lines at the
same time and waits until all of them have finished:

<!-- file: docs/tutorial/11-two-robots.uritp -->
```uritp
# Two robots working at the same time.
robot big = connect("lab:rover-1")
robot small = connect("lab:rover-2")

parallel:
    move big.base to places.kitchen
    drive small.base forward by 1m
log "both robots have finished"
```

Give each robot its manifest by name, with `--robot NAME=MANIFEST`:

```bash
npm run uritp -- run docs/tutorial/11-two-robots.uritp --robot big=manifests/raspberry-pi/pi-rover.uritp --robot small=manifests/arduino/arduino-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
small <- DRIVE frame=base distance=1
big <- MOVE frame=base target=pose(4,1,0,0,0,0)
small -> succeeded
big -> succeeded
log: both robots have finished
The program ended: succeeded.
```

Both instructions start together. The small rover's short drive finishes
first, so `small -> succeeded` comes before `big -> succeeded`. Only when
both are done does the program go on to the `log` line.

Without names, manifests go to the robots in the order the program connects
them.

## 12. From words to programs

URITP is meant to be written by a translator as well as by people. Someone
says "rasoi mein jao" ("go to the kitchen" in Hinglish), and a translator
turns it into:

```
move rover.base to places.kitchen
```

There are two translators. The offline one knows a few dozen phrases in
English, Hindi and Hinglish. The AI one uses Claude and understands much
more, but needs an API key; in this version it is part of the project's code
and not yet available from the command line or the demo. Whatever a
translator writes goes through exactly the same checks as the programs in
this tutorial, so a wrong or unsafe translation never moves a robot.

To try the offline translator in a browser, typing or speaking requests to a
simulated rover:

```bash
npm run demo
```

## 13. Where to go next

You have now used most of URITP. These statements were left out, mostly
because they need abilities the tutorial's robots don't have:

| Statement | What it does | Profile it needs |
|---|---|---|
| `pick OBJECT using ROBOT`, `place OBJECT on TARGET using FRAME` | pick up and put down an object the robot finds itself | `manipulation` |
| `pour from A into B until CONDITION` | pour, for example tea into a mug | `manipulation` |
| `takeoff ROBOT to HEIGHT`, `land ROBOT` | fly | `flight` |
| `weld along ROUTE ...`, `spray ...` | use a tool | `tooling` |
| `confirm "QUESTION"`, `let x = ask "QUESTION"` | ask a person | `speech` |

To learn more:

- [examples/](../examples/) has six longer programs from the URITP
  Guidebook: a drone, a robot dog, a kitchen helper and more.
- [spec/GRAMMAR.md](../spec/GRAMMAR.md) is the exact definition of every
  statement.
- [spec/TYPES_AND_UNITS.md](../spec/TYPES_AND_UNITS.md) lists every unit and
  kind of value.
- [spec/ERRORS.md](../spec/ERRORS.md) explains every error code.
- [spec/DECISIONS.md](../spec/DECISIONS.md) explains why URITP works the way
  it does.
