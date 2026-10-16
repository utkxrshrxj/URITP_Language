# The URITP Tutorial

This tutorial teaches you URITP, a language for telling robots what to do.
It starts from nothing. You do not need to know any other programming
language.

Read it from start to end, and run each program as you go. Every word of
URITP is explained in plain English the first time it appears, in a box
called **New words**. At the end there is a list of every word, every
built-in function, every unit and every error message, so you never need to
look anywhere else.

Every program in this tutorial is in the [docs/tutorial/](tutorial/) folder.
Every output shown is exactly what you will see: a test in the project runs
each command in this tutorial and fails if anything changes.

## Contents

**Part 1: The basics**

1. [Getting started](#1-getting-started)
2. [Your first program](#2-your-first-program)
3. [Values and names](#3-values-and-names)
4. [Places, zones and routes](#4-places-zones-and-routes)
5. [Making decisions](#5-making-decisions)
6. [Repeating and waiting](#6-repeating-and-waiting)
7. [Tasks](#7-tasks)

**Part 2: Doing more**

8. [Hands and grippers](#8-hands-and-grippers)
9. [When things go wrong](#9-when-things-go-wrong)
10. [Safety](#10-safety)
11. [Robots describe themselves](#11-robots-describe-themselves)
12. [Talking with people](#12-talking-with-people)
13. [Cameras and tools](#13-cameras-and-tools)
14. [Flying](#14-flying)
15. [Several robots at once](#15-several-robots-at-once)
16. [Bigger programs](#16-bigger-programs)
17. [Coding for the playground sandboxes](#17-coding-for-the-playground-sandboxes)
18. [From words to programs](#18-from-words-to-programs)

**Part 3: Reference**

- [A. Every word of URITP](#a-every-word-of-uritp)
- [B. Built-in functions and values](#b-built-in-functions-and-values)
- [C. Units](#c-units)
- [D. Every error message](#d-every-error-message)
- [E. Common mistakes](#e-common-mistakes)
- [F. A program to start from](#f-a-program-to-start-from)

---

# Part 1: The basics

## 1. Getting started

### 1.1 What a program is

A **program** is a list of instructions written down in advance. A robot
reads them one at a time, from the top down, and does each one.

URITP programs are written in plain text files whose names end in `.uritp`,
like `hello.uritp`. You can write them in any text editor.

Before a robot moves, URITP **checks** the whole program. If anything is
wrong (a misspelled word, a missing unit, a speed that is too fast for the
robot), it tells you what is wrong, on which line, and how to fix it, and
the robot does not move at all. This is what makes URITP safe.

### 1.2 What you need

You need Node.js 20 or newer on your computer. In the project folder, install
what the project uses, then build it:

```bash
npm install
```

```bash
npm run build
```

You only need to build again if you change the project's own code, not when
you change a URITP program.

### 1.3 How to run a program

Every command in this tutorial has the same shape:

```
npm run uritp -- COMMAND PROGRAM --robot ROBOT_FILE
```

- **COMMAND** is one of:
  - `check`: read the program and check it, without moving anything.
  - `compile`: check it, then list the exact instructions the robot would get.
  - `run`: check it, then run it on a simulated robot.
- **PROGRAM** is the `.uritp` file to use.
- **ROBOT_FILE** is the file in which a robot describes itself: its parts,
  what it can do and its safety limits. It is called a **manifest**.
  Chapter 11 explains it fully.

Before the program's own output, npm prints a few lines of its own that start
with `>`. This tutorial leaves them out. Write `npm run -s uritp -- ...`
(`-s` for silent) to hide them.

Simulated robots move at real speed, so a 4 metre trip at 0.2 metres per
second takes 20 seconds. Add `--speed 10` to any `run` command to make them
ten times faster. Press **Ctrl+C** at any moment to stop every robot.

### 1.4 The robots in this tutorial

Nothing in this tutorial moves a real robot. Every robot is **simulated**: a
program on your computer that behaves like the robot and shows what it would
do.

| Robot | Its file | What it can do |
|---|---|---|
| Camera rover | `manifests/raspberry-pi/pi-rover.uritp` | drive and turn, take photos, measure the distance to what is in front |
| Small rover | `manifests/arduino/arduino-rover.uritp` | drive and turn, measure the distance in front |
| Arm | `manifests/universal-robots/ur-arm.uritp` | move its hand, open and close its gripper |
| Talking rover | `docs/tutorial/robots/talker.uritp` | drive, turn and talk (made up for this tutorial) |
| Drone | `docs/tutorial/robots/drone.uritp` | fly, take photos and spray (made up for this tutorial) |
| Workshop arm | `docs/tutorial/robots/workshop.uritp` | grip, pick things up, pour and weld (made up for this tutorial) |

The first three are named after the hardware their drivers are written for.
They have not been tested on real hardware, and this project is not
affiliated with, certified by or endorsed by those companies.

### 1.5 How to read this tutorial

Each example has up to three boxes:

1. **The program.** Its file is in `docs/tutorial/`, with the name shown in
   the command below it.
2. **The command** that runs it.
3. **The output**: what the command prints.

When a program uses words you have not met yet, a **New words** table right
after it explains each one.

### 1.6 Where to experiment

The "Things to try" at the end of each chapter ask you to change programs.
Copy the tutorial's folder first, and change your copy:

```bash
cp -r docs/tutorial my-tutorial
```

Then use `my-tutorial/` instead of `docs/tutorial/` in the commands. The
tutorial's own files stay as they are, and git ignores your copy.

## 2. Your first program

Here is a whole URITP program:

<!-- file: docs/tutorial/02-hello.uritp -->
```uritp
# My first URITP program: drive forward, turn left, then back up a little.
robot rover = connect("lab:rover-1")

drive rover.base forward by 50cm
turn rover.base by 90deg
drive rover.base backward by 20cm
```

**New words**

| Word | What it means |
|---|---|
| `#` | Starts a **comment**: a note for people. Everything after `#` on that line is ignored by the robot. |
| `robot` | Starts a line that connects a robot and gives it a name. Every program has one `robot` line for each robot it uses, before the lines that use it. |
| `connect` | Says where to find the robot: `connect("ADDRESS")`. With simulated robots, any address works. |
| `drive` | Moves a robot that has wheels (or legs) straight ahead or straight back. |
| `forward` | With `drive`: go the way the robot is facing. |
| `backward` | With `drive`: go the opposite way, without turning round. |
| `by` | How far to `drive`, or how much to `turn`. |
| `turn` | Turns the robot on the spot. A positive angle turns left, a negative one (like `-90deg`) turns right. |

Some other things to notice:

- `rover` is a **name** you chose. You could call it `bob` instead, as long as
  you use `bob` everywhere after that.
- `rover.base` means "the `base` part of the robot called `rover`". The base
  is the part that moves the whole robot around. A dot (`.`) always means
  "the part or property of".
- `50cm` is a **quantity**: a number with its unit. In URITP, every amount
  has a unit.
- Each instruction is on a line of its own. Blank lines are ignored, so use
  them to group your lines.

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
rover <- DRIVE frame=base distance=-0.2
rover -> succeeded
The program ended: succeeded.
```

How to read the output:

- `rover <- DRIVE ...` is one **instruction** sent to the robot. The arrow
  points at the robot.
- `rover -> succeeded` is the robot's answer: it did it. Other answers are
  `failed` (with a reason) and `cancelled`.
- The numbers are in standard units: `distance=0.5` is 0.5 metres and
  `angle=1.57079632679` is 90 degrees written in radians. Driving backward is
  a negative distance. URITP converts every amount for you, so no robot ever
  has to.
- The last line says how the whole program ended.

### 2.1 What the robot itself receives

Each kind of robot has its own language. A **driver** is the part of URITP
that translates instructions into that language. Add `--protocol` to see
what the camera rover's driver would send:

```bash
npm run uritp -- run docs/tutorial/02-hello.uritp --robot manifests/raspberry-pi/pi-rover.uritp --protocol
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- DRIVE frame=base distance=0.5
rover -> succeeded
rover <- TURN frame=base angle=1.57079632679
rover -> succeeded
rover <- DRIVE frame=base distance=-0.2
rover -> succeeded
The program ended: succeeded.
Lines the rover driver would send (simulator only, not tested on real hardware):
  {"service":"motors","command":"drive","distance":0.5}
  {"service":"motors","command":"turn","angle":1.57079632679}
  {"service":"motors","command":"drive","distance":-0.2}
```

**Things to try** (in your copy):

- Drive `1m` instead of `50cm`.
- Turn right with `-90deg`.
- Add a line `drive rover.base forward by 30cm` at the end.

## 3. Values and names

### 3.1 Kinds of values

A **value** is a piece of information a program works with. URITP has these
kinds:

| Kind | Examples | Used for |
|---|---|---|
| Quantity (an amount with a unit) | `50cm`, `0.2m/s`, `90deg`, `2s`, `30N` | distances, speeds, angles, times, forces |
| Plain number | `3`, `0.5` | counting, like `repeat 3 times` |
| Percent | `25%`, `80%` | battery level, how full something is |
| Text | `"Hello"` | messages, file names |
| True or false | `true`, `false` | answers to yes-or-no questions |

Units are glued to the number with no space: `50cm`, never `50 cm`. Units
are case-sensitive: `ms` means milliseconds and `m/s` means metres per
second. The full list is in [C. Units](#c-units).

### 3.2 Giving a value a name

<!-- file: docs/tutorial/03-kinds.uritp -->
```uritp
# The kinds of values URITP has: amounts with units, plain numbers, percents, text, and true or false.
robot rover = connect("lab:rover-1")

let step = 50cm
let laps = 3
let low_battery = 20%
let message = "Ready to go"
let lights_on = true
let in_a_hurry = false
log message, step, laps, low_battery, lights_on, in_a_hurry
```

```bash
npm run uritp -- run docs/tutorial/03-kinds.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
log: Ready to go, 50cm, 3, 20%, true, false
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `let` | Gives a value a name: `let NAME = VALUE`. After that line, the name stands for the value. |
| `log` | Writes values into the program's log (a record for people), not to the robot. Separate several values with commas. |
| `true` | The value "yes". |
| `false` | The value "no". |

**Rules for names:**

- A name is made of the letters `a` to `z` and `A` to `Z`, the digits `0` to
  `9`, and `_`. It must start with a letter or `_`. Examples: `step`,
  `low_battery`, `bin_2`.
- Upper and lower case are different: `Step` and `step` are two names.
- A name can be given a value only once in the same block (blocks are
  explained in chapter 5). This keeps programs easy to follow.
- A few words belong to URITP itself and cannot be names, like `move`,
  `stop` and `place`. They are all listed in
  [A. Every word of URITP](#a-every-word-of-uritp).

### 3.3 Doing sums with amounts

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

**New words**

| Word | What it means |
|---|---|
| `speed` | How fast to move: `drive ... speed 0.2m/s`. Without `speed`, the robot chooses its own speed (the simulated rovers use 0.2m/s), never above its limit. |

- `20cm + 5mm` is `20.5cm`. You can add and subtract amounts of the same kind
  (two lengths, two times) whatever their units. The answer uses the unit on
  the left. There is no `*` (times) or `/` (divide).
- `"one step is {step}"` is **text** with an **insertion**: `{step}` is
  replaced by the value of `step`. Text goes between double quotes `"` and
  must stay on one line. Only names can go between `{ }`, like `{step}` or
  `{spot.name}`.

`compile` shows the instructions in standard units without running anything:

```bash
npm run uritp -- compile docs/tutorial/03-values.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Instructions for rover (SI units):
  DRIVE frame=base distance=0.205 speed=0.1
  DRIVE frame=base distance=-0.205 speed=0.1
These are the instructions each robot would receive if every task succeeds, using the simulator's default readings.
```

### 3.4 When you make a mistake

This program has three mistakes, on purpose:

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

Every message has a **code**, the **line**, what is wrong, and a **fix**:

- **E304:** `50` has no unit. It could mean 50 centimetres or 50 metres, and
  guessing would be dangerous.
- **E301:** a length and a time cannot be added.
- **E207:** `step` was already given a value one line up.

The letter and first digit of a code say what kind of problem it is:

| Codes | Kind of problem |
|---|---|
| E1xx | The program is not written correctly (spelling, brackets, indentation). |
| E2xx | A name is unknown or used twice. |
| E3xx | The wrong kind of value, or the wrong unit. |
| E4xx | The robot cannot do this. |
| E5xx | It would break a safety limit. |
| W6xx | A warning: it may not work on every robot. Warnings do not stop a program. |
| R7xx | Something went wrong while the program was running. |

Every code is explained in [D. Every error message](#d-every-error-message).
Add `--lang hi` to any command to see the messages in Hindi. The codes stay
the same:

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
"4 metres east and 1 metre north". A **site map** is a file that gives
places names. URITP uses the file called `site.uritp` next to your program.
This is the tutorial's:

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

**New words**

| Word | What it means |
|---|---|
| `define` | Gives a place, a zone or a route a name: `define place NAME = ...`. Used in site maps (and in programs, see chapter 16). |
| `place` | After `define`: a single position. (On its own, `place` is also a statement for putting things down, see chapter 8.) |
| `zone` | After `define`: an area, given by its corners. |
| `route` | After `define`: a list of places, in order. |

Some other things to notice:

- `pose(x, y, z)` is a **position**: x metres east, y metres north and z
  metres up from one corner of the building. The dock, where the rover
  starts, is at `pose(0m, 0m, 0m)`.
- `polygon(...)` is an area made from three or more poses, its corners.
- `[ ... ]` is a **list**: values between square brackets, separated by
  commas.
- The `stairs` line is too long, so it carries on the next line, indented by
  4 spaces. That is a **continuation line**.

In a program, these are `places.kitchen`, `zones.stairs` and `route.rounds`.
Use `--site FILE` to choose a different site map.

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

**New words**

| Word | What it means |
|---|---|
| `move` | Moves a part of a robot to a target: `move PART to TARGET`. The robot works out how to get there from wherever it is. |
| `to` | Where to go, in `move` and `takeoff`. |

The place became its position in metres, `pose(4,1,0,0,0,0)`. The last three
numbers say which way it faces (roll, pitch and yaw, in radians).

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

**New words**

| Word | What it means |
|---|---|
| `avoid` | With `move`: never enter this zone on the way. It can go on the same line as `move`, or on the next line indented by 4 spaces. Write it more than once to avoid several zones. |

The zone's corners travel with the instruction, so the robot itself keeps
out. Chapter 9 shows what happens when it cannot.

### 4.4 Going by way of a route, and how close is close enough

<!-- file: docs/tutorial/04-via-and-tolerance.uritp -->
```uritp
# Going to the door by way of the rounds route, and stopping within 5cm of it.
robot rover = connect("lab:rover-1")

move rover.base to places.door via route.rounds tolerance 5cm
move rover.base to pose(1m, 1m, 0m) speed 0.2m/s
```

```bash
npm run uritp -- run docs/tutorial/04-via-and-tolerance.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(0,3.5,0,0,0,0) tolerance=0.05 via=[pose(4,1,0,0,0,0),pose(2,3,0,0,0,0),pose(0,3.5,0,0,0,0)]
rover -> succeeded
rover <- MOVE frame=base target=pose(1,1,0,0,0,0) speed=0.2
rover -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `via` | With `move`: pass through the places of a route, in order, on the way. |
| `tolerance` | With `move`: how close to the target counts as "arrived", like `tolerance 5cm`. |

The second line moves to a position written straight into the program with
`pose(...)`, instead of a named place.

The extra parts of a `move` line (`speed`, `via`, `tolerance`, `avoid`) can
come in any order.

**Things to try:** in your copy of `site.uritp`, add
`define place printer = pose(1m, 2m, 0m)` and send the rover there.

## 5. Making decisions

### 5.1 if, elif and else

A robot can look before it moves:

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

**New words**

| Word | What it means |
|---|---|
| `if` | `if CONDITION:` runs the lines under it only when the condition is true. |
| `elif` | "else if": checked only when everything above it was false. You can have any number of them, or none. |
| `else` | `else:` runs when nothing above it was true. It is optional. |

- `rover.sense("distance_front")` reads the sensor called `distance_front`,
  and `.value` is the distance it measured. In the simulator nothing is ever
  in front of the rover, so it reads 2 metres and the `else` part runs.
- A line ending in `:` starts a **block**: the lines under it, indented by
  exactly **4 spaces**. The block ends when the lines go back to the left.
  Never use the Tab key for indentation; URITP refuses tabs.

A **condition** is a question whose answer is `true` or `false`. These compare
two values of the same kind:

| Write | Means |
|---|---|
| `a < b`, `a <= b` | less than, less than or equal |
| `a > b`, `a >= b` | more than, more than or equal |
| `a == b` | equal (two `=` signs; one `=` is only for `let`) |
| `a != b` | not equal |

A distance compared with a bare number, like `front < 30`, is an error with
the fix "Did you mean 30cm?".

### 5.2 and, or and not

<!-- file: docs/tutorial/05-and-or-not.uritp -->
```uritp
# Combining conditions with and, or and not.
robot rover = connect("lab:rover-1")

let far = distance(places.dock, places.door)
let charged = rover.battery > 50%
log "the door is {far} away; charged: {charged}"
if charged and far < 5m:
    move rover.base to places.door
if not charged or far >= 5m:
    log "staying at the dock"
```

```bash
npm run uritp -- run docs/tutorial/05-and-or-not.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- SENSE sensor=battery
rover -> succeeded
log: the door is 3.5m away; charged: true
rover <- MOVE frame=base target=pose(0,3.5,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `and` | True only when both sides are true. |
| `or` | True when at least one side is true. |
| `not` | Turns true into false and false into true. |

- `distance(a, b)` works out the straight-line distance between two places.
- `rover.battery` is how full the robot's battery is, as a percent. In the
  simulator it is always 100%.
- `let charged = rover.battery > 50%` stores the answer to a question, true
  or false, under a name.
- When `and`, `or` and `not` are mixed, `not` is worked out first, then
  `and`, then `or`. Use brackets `( )` to make the order clear.

**Things to try:** in `05-decisions.uritp`, change `1m` to `3m` so the `elif`
part runs instead.

## 6. Repeating and waiting

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

**New words**

| Word | What it means |
|---|---|
| `repeat` | Runs the block under it again and again. What follows says how often: `N times`, `forever` or `every TIME`. |
| `times` | `repeat N times:` runs the block N times. N is a whole number, or a name that holds one. |

### 6.2 Once for each item in a list

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

**New words**

| Word | What it means |
|---|---|
| `for` | `for NAME in LIST:` runs the block once for every item of the list, with NAME standing for the current item. |
| `in` | Between the name and the list in a `for` line. |

`point.name` is the name of the place, like `kitchen`. The photos are
explained in chapter 13.

### 6.3 Stopping a loop early

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

**New words**

| Word | What it means |
|---|---|
| `break` | Leaves the loop it is in at once. The program carries on after the loop. It can only be used inside `repeat` or `for`. |

Nothing is ever close in the simulator, so all five steps run.

### 6.4 Waiting

<!-- file: docs/tutorial/06-waiting.uritp -->
```uritp
# Waiting: for a set time, and until something is true.
robot rover = connect("lab:rover-1")

log "waiting 2 seconds"
wait 2s
wait until rover.battery > 50% timeout 10s
log "the battery is above half, so off we go"
move rover.base to places.desk
```

```bash
npm run uritp -- run docs/tutorial/06-waiting.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
log: waiting 2 seconds
rover <- WAIT duration=2
rover -> succeeded
rover <- SENSE sensor=battery
rover -> succeeded
log: the battery is above half, so off we go
rover <- MOVE frame=base target=pose(2,3,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `wait` | `wait TIME` pauses for that long. `wait until CONDITION` pauses until the condition is true. |
| `until` | After `wait` (and after `pour`, chapter 8): the condition to wait for. |
| `timeout` | After `wait until ...`: the longest to wait. If the condition is still false by then, the wait **fails** (chapter 9 shows how to handle failures). |

With one robot, `wait 2s` is sent to the robot as a `WAIT` instruction, so it
pauses too. `wait until` reads the battery, so you see a `SENSE`.

### 6.5 Loops that keep going

These two loops have no end of their own, so each one stops itself with
`break`:

<!-- file: docs/tutorial/06-forever.uritp -->
```uritp
# A loop with no end of its own: it stops itself with break after 3 seconds.
robot rover = connect("lab:rover-1")

repeat forever:
    drive rover.base forward by 20cm
    drive rover.base backward by 20cm
    if now() >= 3s:
        break
log "done after", now()
```

<!-- file: docs/tutorial/06-every.uritp -->
```uritp
# A loop that runs once every second, and stops after about 3 seconds.
robot rover = connect("lab:rover-1")

repeat every 1s:
    log "battery", rover.battery
    if now() >= 3s:
        break
```

```bash
npm run uritp -- run docs/tutorial/06-forever.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```bash
npm run uritp -- run docs/tutorial/06-every.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

**New words**

| Word | What it means |
|---|---|
| `forever` | `repeat forever:` runs the block again and again until a `break`, a failure or a stop. |
| `every` | `repeat every TIME:` runs the block once every TIME, like `repeat every 10s:`. |

`now()` is how long the program has been running, like `3.2s`. The output of
these two depends on exact timing, so it is not shown here.

**Things to try:** make the rover drive a triangle. Each turn is `120deg`.

## 7. Tasks

### 7.1 Naming a list of steps

A **task** is a list of steps with a name, so you can use it again and again.
Other languages call this a function or a method.

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

**New words**

| Word | What it means |
|---|---|
| `task` | `task NAME(INPUTS):` defines a task. The block under it is what the task does. |

- `spot` is the task's **input**: a name that stands for whatever value is
  given when the task is used. A task can have no inputs `()`, or several,
  separated by commas.
- `visit(places.kitchen)` **uses** (or "calls") the task, with `spot`
  standing for the kitchen. Defining a task does nothing by itself; only
  using it does.
- A task must be written above the lines that use it, and can use names
  defined above it.

### 7.2 A task that gives back a value

<!-- file: docs/tutorial/07-return.uritp -->
```uritp
# A task can work something out and give it back with return.
robot rover = connect("lab:rover-1")

task farther(a, b):
    if distance(places.dock, a) > distance(places.dock, b):
        return a
    else:
        return b

let goal = farther(places.kitchen, places.desk)
log "the farther place is", goal.name
move rover.base to goal
```

```bash
npm run uritp -- run docs/tutorial/07-return.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
log: the farther place is, kitchen
rover <- MOVE frame=base target=pose(4,1,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `return` | Ends the task at once and gives back the value after it. Only allowed inside a task. A task that never uses `return` gives nothing back. |

### 7.3 A task on a robot arm

An arm works on a table instead of a building, so its programs are in their
own folder, [tutorial/arm/](tutorial/arm/), with their own site map:

<!-- file: docs/tutorial/arm/site.uritp -->
```uritp
# The site map for the arm chapters: two spots on a table, with the tool pointing down
# (roll=180deg), and a seam to weld. Illustrative positions only.

define place bin_a = pose(0.4m, 0.1m, 0.05m, roll=180deg)
define place bin_b = pose(0.3m, -0.3m, 0.05m, roll=180deg)
define place seam_start = pose(0.5m, -0.1m, 0.02m, roll=180deg)
define place seam_end   = pose(0.5m, 0.1m, 0.02m, roll=180deg)
define route seam = [places.seam_start, places.seam_end]
```

`roll=180deg` turns the hand upside down, so it points down at the table.

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

- `arm.tool` is the end of the arm, where the gripper is.
- `move_part` has two inputs, `from_spot` and `to_spot`. Words of URITP like
  `from`, `to` and `place` cannot be names, which is why these are longer.
- `grip` is explained in the next chapter.

The arm's driver writes URScript-style text, the kind of language Universal
Robots arms use.

---

# Part 2: Doing more

## 8. Hands and grippers

### 8.1 Gripping, and positions near a place

<!-- file: docs/tutorial/arm/08-grip.uritp -->
```uritp
# The gripper, and the helpers that work out a position near a place.
robot arm = connect("lab:arm-1")

move arm.tool to places.bin_a.above(10cm)
grip arm.gripper close force 30N
grip arm.gripper open
move arm.tool to places.bin_a.offset(0cm, 5cm, 10cm)
move arm.tool to places.bin_a.at_height(20cm)
move arm.tool to places.bin_a.above(10cm).below(5cm)
```

```bash
npm run uritp -- run docs/tutorial/arm/08-grip.uritp --robot manifests/universal-robots/ur-arm.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
arm <- MOVE frame=tool target=pose(0.4,0.1,0.15,3.14159265359,0,0)
arm -> succeeded
arm <- ACTUATE actuator=gripper state=closed force=30
arm -> succeeded
arm <- ACTUATE actuator=gripper state=open
arm -> succeeded
arm <- MOVE frame=tool target=pose(0.4,0.15,0.15,3.14159265359,0,0)
arm -> succeeded
arm <- MOVE frame=tool target=pose(0.4,0.1,0.2,3.14159265359,0,0)
arm -> succeeded
arm <- MOVE frame=tool target=pose(0.4,0.1,0.1,3.14159265359,0,0)
arm -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `grip` | Opens or closes a gripper: `grip PART open` or `grip PART close`. |
| `open` | With `grip`: open the gripper and let go. |
| `close` | With `grip`: close the gripper and hold on. |
| `force` | With `grip ... close`: squeeze with at most this force, like `force 30N`. It must be within the gripper's limit. |

Positions near a place, written after a place with a dot:

| Helper | Gives |
|---|---|
| `.above(10cm)` | 10cm higher, with the hand pointing down |
| `.below(5cm)` | 5cm lower |
| `.at_height(20cm)` | the same spot, at exactly 20cm high |
| `.offset(x, y, z)` | moved by three lengths: east, north and up |
| `.beside(10cm)` | 10cm to the side |
| `.in_front(10cm)` | 10cm in front |

Helpers can follow each other: `places.bin_a.above(10cm).below(5cm)` is 5cm
above the bin.

### 8.2 Picking things up, putting them down and pouring

These statements work with **things** (objects) the robot finds with its own
camera, like a cup. A name that is not a place, a robot or anything you
defined is taken to be a thing: here `cup`, `kettle` and `mug`.

<!-- file: docs/tutorial/arm/08-pick-and-pour.uritp -->
```uritp
# pick, place and pour work on things the robot finds with its camera. The simulator has none,
# so each try fails, and on fail says so.
robot arm = connect("lab:arm-1")

task tidy_cup():
    pick cup using arm onto arm.tool
    place cup on places.bin_b using arm.tool
    on fail:
        log "no cup: {error.reason}"

task make_tea():
    pour from kettle into mug until mug.fill >= 80%
    on fail:
        log "no tea: {error.reason}"

tidy_cup()
make_tea()
```

```bash
npm run uritp -- run docs/tutorial/arm/08-pick-and-pour.uritp --robot docs/tutorial/robots/workshop.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
arm <- SKILL name=pick object=cup onto=tool
arm -> failed: could not find 'cup'
log: no cup: pick failed: could not find 'cup'
arm <- SKILL name=pour from=kettle into=mug until=mug.fill>=0.8
arm -> failed: could not find 'mug'
log: no tea: pour failed: could not find 'mug'
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `pick` | `pick THING using ROBOT`: the robot finds the thing, grips it and lifts it. |
| `using` | Which robot (with `pick`) or which part (with `place`) does the job. |
| `onto` | With `pick`: which part to hold the thing with, like `onto arm.tool`. Optional. |
| `place` | `place THING on TARGET using PART`: puts a held thing down at a target. |
| `on` | Where to put something (`place ... on`, `spray ... on`). Also part of `on fail`. |
| `pour` | `pour from A into B until CONDITION`: pours from one thing into another until the condition is true. |
| `from` | With `pour`: the thing to pour from. |
| `into` | With `pour`: the thing to pour into. |

- `mug.fill` is how full the mug is, as a percent.
- The simulator has no camera picture, so it cannot find a cup, a kettle or
  a mug, and each try **fails**. `on fail:` (chapter 9) catches each failure
  and logs it, so the program still ends well. On a real robot with a camera,
  the cup would be found.

**Things to try:** move the part three times between the two bins, using the
`move_part` task from chapter 7 inside `repeat 3 times:`.

## 9. When things go wrong

### 9.1 A robot that cannot do something

The robots in this project plan straight paths. The landing is behind the
stairs, so no straight path reaches it while keeping out of them:

<!-- file: docs/tutorial/09-no-plan.uritp -->
```uritp
# Trying to reach the stairs landing, with no plan for what to do if that fails.
robot rover = connect("lab:rover-1")

move rover.base to places.landing
    avoid zones.stairs
log "I am on the landing"
```

```bash
npm run uritp -- run docs/tutorial/09-no-plan.uritp --robot manifests/raspberry-pi/pi-rover.uritp
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

The robot refused rather than go through the stairs. The program had no plan
for this, so URITP stopped every robot (`rover <- STOP`), ended the program
as **failed**, and said why. The `log` line never ran.

### 9.2 Having a plan: on fail

<!-- file: docs/tutorial/09-on-fail.uritp -->
```uritp
# Trying to reach the stairs landing, and going back to the dock if the robot cannot.
robot rover = connect("lab:rover-1")

move rover.base to places.landing
    avoid zones.stairs
log "I am on the landing"
on fail:
    log "I could not get there: {error.reason} ({error.code})"
    move rover.base to places.dock
```

```bash
npm run uritp -- run docs/tutorial/09-on-fail.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(9,1,0,0,0,0) avoid=[polygon((8,0),(10,0),(10,2),(8,2))]
rover -> failed: no straight path to the target stays out of a zone to avoid
log: I could not get there: move failed: no straight path to the target stays out of a zone to avoid (R703)
rover <- MOVE frame=base target=pose(0,0,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `on fail` | `on fail:` says what to do if anything above it in the same block fails. The rest of that block is skipped, the `on fail:` block runs, and the program carries on after the block. |
| `fail` | Only used in `on fail`. |

- `on fail:` must come last in its block, lined up with the lines it
  protects. It can be at the end of the whole program, of a task, of a loop
  or of an `if`.
- Inside it, `error.reason` says what went wrong, and `error.code` is its
  code, like `R703`.
- The failure was handled, so the program ended as **succeeded**.
- A task's `on fail:` can use the task's inputs, for example
  `log "I could not reach {spot.name}"` in a task `visit(spot)`. It cannot
  use names the task sets with `let`, because the failure may have happened
  before that line.

### 9.3 Stopping a robot on purpose

<!-- file: docs/tutorial/09-stop.uritp -->
```uritp
# The program stops the rover itself, then carries on with the next line.
robot rover = connect("lab:rover-1")

drive rover.base forward by 1m
stop rover
log "the rover is stopped; the program goes on"
drive rover.base backward by 1m
```

```bash
npm run uritp -- run docs/tutorial/09-stop.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- DRIVE frame=base distance=1
rover -> succeeded
rover <- STOP
log: the rover is stopped; the program goes on
rover <- DRIVE frame=base distance=-1
rover -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `stop` | `stop ROBOT` stops that robot's motion at once. The program itself carries on. (In a safety rule, `stop` ends the program, see chapter 10.) |

**Things to try:** in `09-on-fail.uritp`, make the `on fail:` block go to the
kitchen instead.

## 10. Safety

A robot must never be put in danger by a program, even a wrong one. URITP
keeps robots safe in four ways.

### 10.1 Checked before anything moves

The camera rover's manifest says it must never go faster than 0.3m/s:

<!-- file: docs/tutorial/10-too-fast.uritp -->
```uritp
# Asking for more speed than the robot's safety limit allows.
robot rover = connect("lab:rover-1")

move rover.base to places.kitchen speed 1m/s
```

```bash
npm run uritp -- check docs/tutorial/10-too-fast.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
E502 (line 4): speed 1m/s exceeds safety limit 0.3m/s for 'rover'
  Fix: Use a speed of at most 0.3m/s. A program can never switch safety limits off (Guidebook §9.3 rule 6).
1 error(s), 0 warning(s).
```

`run` refuses this program in the same way, before the robot gets anything.
No program can switch a safety limit off.

### 10.2 Safety rules, watched the whole time

<!-- file: docs/tutorial/10-safety.uritp -->
```uritp
# A safety rule is watched the whole time the program runs.
robot rover = connect("lab:rover-1")

safety:
    stop rover when rover.battery < 20%

log "battery: {rover.battery}"
move rover.base to places.kitchen speed 0.3m/s
```

```bash
npm run uritp -- run docs/tutorial/10-safety.uritp --robot manifests/raspberry-pi/pi-rover.uritp
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

**New words**

| Word | What it means |
|---|---|
| `safety` | `safety:` starts a block of **safety rules**. It must be at the left edge of the program, after the `robot` lines. Its rules are checked before every instruction and every fraction of a second while the program runs. |
| `when` | In a safety rule: `ACTION when CONDITION`. The action happens the moment the condition becomes true. |

The one `SENSE` shown is the program's own `log` line reading the battery.
The rule reads it too, again and again, but those readings are not shown, so
they do not bury the program's own steps. Add `--protocol` to see every
reading the driver sends. The simulated battery stays at 100%, so the rule
never acts.

### 10.3 Every kind of rule

<!-- file: docs/tutorial/10-safety-short.uritp -->
```uritp
# Safety rules that leave out the robot, and alerts with and without a message.
robot rover = connect("lab:rover-1")

safety:
    stop when rover.battery < 10%
    alert "Battery below half: time to charge soon" when rover.battery < 50%
    alert when rover.sense("distance_front").value < 10cm

for point in route.rounds:
    move rover.base to point
move rover.base to places.dock
```

```bash
npm run uritp -- run docs/tutorial/10-safety-short.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(4,1,0,0,0,0)
rover -> succeeded
rover <- MOVE frame=base target=pose(2,3,0,0,0,0)
rover -> succeeded
rover <- MOVE frame=base target=pose(0,3.5,0,0,0,0)
rover -> succeeded
rover <- MOVE frame=base target=pose(0,0,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

A safety rule does one of these things. The robot may be named, or left out:

| Rule | What happens when the condition becomes true |
|---|---|
| `stop ROBOT when ...` | That robot stops, and the program ends as **cancelled**. |
| `stop when ...` | Every robot stops, and the program ends as **cancelled**. |
| `return_home ROBOT when ...`, or `return_home when ...` | The program ends, and the flying robot goes back to where it took off. Needs a robot that can fly (chapter 14). |
| `land ROBOT when ...`, or `land at PLACE when ...` | The program ends, and the flying robot lands (at that place, if one is given). |
| `alert "MESSAGE" when ...`, or `alert when ...` | A message is shown to the people in charge, and the program carries on. Without a message, it says which rule it was. |

None of these rules acts here, because the simulated battery stays at 100%
and nothing is ever close.

### 10.4 The robot checks too

Every driver checks every instruction against the robot's own limits, even
though URITP already checked the program. If a check were ever missed, the
robot would still refuse, just as the rover in chapter 9 refused a path it
could not take safely.

### 10.5 Stop, at any moment

Press **Ctrl+C** while a program runs. Every robot stops at once, and the
program ends as **cancelled**. Try it with `06-rounds.uritp`.

## 11. Robots describe themselves

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

**New words** (only used in manifests)

| Word | What it means |
|---|---|
| `manifest` | Starts a manifest: `manifest "NAME":`, followed by its lines, indented. |
| `uritp` | Which version of URITP the robot understands. Always `uritp 0.1` for now. |
| `frame` | A part that moves: `frame NAME: KIND ...`. KIND is `pose2d` (moves on the floor), `pose3d` (moves in the air) or `pose6d` (moves and tilts freely, like an arm's hand). After it, optionally: `reach` (how far it reaches), `max_speed` (how fast it can go) and `payload` (the most it can carry). |
| `actuator` | A part with a few fixed positions: `actuator NAME: states [open, closed]`, optionally with `max_force` (the hardest it can squeeze). |
| `sensor` | Something that measures: `sensor NAME: KIND`, optionally with `dimension` saying what its readings are (`Length`, `Temperature`...). |
| `profiles` | The groups of things the robot can do, in a list. Every robot has `core`. |
| `extension` | A special ability of one kind of robot, with the inputs it takes. Chapter 13 uses one. |

`safety max_speed 0.3m/s` is the speed limit from chapter 10. A manifest can
also say `safety forbidden_zone zones.NAME`: a zone the robot may never
enter, whatever the program says. The comment lines at the top say which
hardware the manifest is written for, and that its numbers are only
examples.

These are the profiles, and what each one allows:

| Profile | What it allows |
|---|---|
| `core` | Every robot: `move`, `stop`, `wait`, `if`, `for`, `repeat`, tasks, `log`, `alert`, safety rules, places and sensors |
| `navigation` | `drive`, `turn`, `via`, `avoid` |
| `manipulation` | `grip`, `pick`, `place`, `pour` |
| `flight` | `takeoff`, `land`, `turn`, `return_home` |
| `legged` | `turn`, for robots that walk |
| `speech` | `say`, `confirm`, `ask`, `lang` |
| `vision` | `capture`, `.analyse(...)` |
| `tooling` | `weld`, `spray` |

### 11.1 The same program on a different robot

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
rover <- DRIVE frame=base distance=-0.2
rover -> succeeded
The program ended: succeeded.
Lines the rover driver would send (simulator only, not tested on real hardware):
  F 500 200
  L 9000 2865
  B 200 200
```

`F 500 200` means forward 500 millimetres at 200 millimetres per second, and
`L 9000 2865` means turn left 90.00 degrees at 28.65 degrees per second. The
camera rover got the same instructions as JSON messages. This is the point of
URITP: one program, many robots.

### 11.2 A robot that cannot

The small rover has no camera, so it cannot do the rounds from chapter 6:

```bash
npm run uritp -- check docs/tutorial/06-rounds.uritp --robot manifests/arduino/arduino-rover.uritp
```

```text
E205 (line 6): robot 'rover' has no sensor 'camera'
  Fix: Its sensors are: distance_front.
1 error(s), 0 warning(s).
```

And the camera rover cannot speak:

<!-- file: docs/tutorial/11-no-speech.uritp -->
```uritp
# The camera rover cannot speak, so a program that uses say is refused for it.
robot rover = connect("lab:rover-1")

say "Hello!"
move rover.base to places.kitchen
```

```bash
npm run uritp -- check docs/tutorial/11-no-speech.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
E401 (line 4): 'say' requires profile 'speech'; rover supports [core, navigation, vision]
  Fix: Use a robot whose manifest has this profile, or leave this statement out.
1 error(s), 0 warning(s).
```

### 11.3 Robots made up for this tutorial

You can describe a robot yourself. These three are made up for the next
chapters. They have no driver of their own, so URITP shows their instructions
just as they are.

A rover that can talk:

<!-- file: docs/tutorial/robots/talker.uritp -->
```uritp
# A rover made up for the tutorial: it can drive and talk.
manifest "Talking rover (tutorial)":
    uritp 0.1
    frame base: pose2d max_speed 0.5m/s payload 1kg
    sensor distance_front: ultrasonic dimension Length
    profiles [core, navigation, speech]
    safety max_speed 0.3m/s
```

A drone:

<!-- file: docs/tutorial/robots/drone.uritp -->
```uritp
# A drone made up for the tutorial: it flies, takes photos and sprays.
manifest "Field drone (tutorial)":
    uritp 0.1
    frame base: pose3d max_speed 3m/s
    actuator sprayer: states [off, on]
    sensor camera: rgb
    sensor height: range dimension Length
    profiles [core, flight, vision, tooling]
    safety max_speed 2m/s
    safety forbidden_zone zones.stairs
```

An arm for a workshop:

<!-- file: docs/tutorial/robots/workshop.uritp -->
```uritp
# An arm made up for the tutorial: it grips, picks things up, pours and welds.
manifest "Workshop arm (tutorial)":
    uritp 0.1
    frame tool: pose6d reach 0.85m max_speed 1m/s payload 3kg
    actuator gripper: states [open, closed] max_force 60N
    sensor camera: rgb
    profiles [core, manipulation, tooling, vision]
    extension examplecorp.adaptive_weld(seam: Route, current: Quantity<Current>)
    safety max_speed 0.5m/s
```

**Things to try:** remove `speech` from the `profiles` line in your copy of
`robots/talker.uritp`, and run `check` on `12-talk.uritp` with it.

## 12. Talking with people

### 12.1 Speaking, alerts and the log

<!-- file: docs/tutorial/12-talk.uritp -->
```uritp
# A rover that tells people what it is doing, in English and in Hindi, and keeps a log.
robot rover = connect("lab:talker-1")

say "Hello! I am going to the kitchen."
move rover.base to places.kitchen
say "मैं रसोई में पहुँच गया हूँ" lang hi
alert "Kitchen reached: please put the tray on me"
log "arrived at", places.kitchen.name
```

```bash
npm run uritp -- run docs/tutorial/12-talk.uritp --robot docs/tutorial/robots/talker.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- SAY text="Hello! I am going to the kitchen."
rover -> succeeded
rover <- MOVE frame=base target=pose(4,1,0,0,0,0)
rover -> succeeded
rover <- SAY text="मैं रसोई में पहुँच गया हूँ" lang=hi
rover -> succeeded
ALERT: Kitchen reached: please put the tray on me
log: arrived at, kitchen
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `say` | The robot says (or shows) a message to the people near it. Needs the `speech` profile. |
| `lang` | After the text of `say`, `confirm` or `ask`: which language it is in, like `lang hi` for Hindi. |
| `alert` | `alert "MESSAGE"` sends a message to the people in charge of the robot (shown as `ALERT:`). It does not need `speech`. |

`log` (chapter 3) is for a record of what happened. `say` is for the people
near the robot, and `alert` is for the people in charge.

### 12.2 Asking questions

<!-- file: docs/tutorial/12-questions.uritp -->
```uritp
# Asking people: confirm waits for a yes, and ask waits for an answer.
robot rover = connect("lab:talker-1")

confirm "Shall I go to the kitchen?"
move rover.base to places.kitchen
let dish = ask "What shall I bring back?"
say "OK, I will bring {dish}."
move rover.base to places.dock
```

```bash
npm run uritp -- run docs/tutorial/12-questions.uritp --robot docs/tutorial/robots/talker.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- CONFIRM text="Shall I go to the kitchen?"
rover -> succeeded
rover <- MOVE frame=base target=pose(4,1,0,0,0,0)
rover -> succeeded
rover <- ASK text="What shall I bring back?"
rover -> succeeded
rover <- SAY text="OK, I will bring ."
rover -> succeeded
rover <- MOVE frame=base target=pose(0,0,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `confirm` | `confirm "QUESTION"` asks a yes-or-no question. On yes, the program carries on. On no, or no answer, the program stops safely. |
| `ask` | `let NAME = ask "QUESTION"` asks a question and stores the answer, as text, under NAME. It can only be used in a `let` line. |

In the simulator nobody is there to answer: `confirm` counts as yes, and
`ask` gives back empty text, which is why the robot says "OK, I will bring ."
A real robot would hear the person.

## 13. Cameras and tools

### 13.1 Taking photos

<!-- file: docs/tutorial/13-photos.uritp -->
```uritp
# Photos with the camera: one at each end of the office.
robot rover = connect("lab:rover-1")

move rover.base to places.kitchen
capture rover.camera save as "kitchen.jpg"
move rover.base to places.door
capture rover.camera save as "door.jpg"
```

```bash
npm run uritp -- run docs/tutorial/13-photos.uritp --robot manifests/raspberry-pi/pi-rover.uritp
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
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `capture` | `capture SENSOR save as "FILE"` takes a photo with a camera. Needs the `vision` profile. |
| `save` | Part of `save as`. |
| `as` | Part of `save as`: the file name for the photo, in quotes. It can contain insertions, like `"{point.name}.jpg"`. |

A camera photo is a reading of the camera, which is why it shows up as a
`SENSE` instruction.

### 13.2 Welding, and a robot's own special abilities

<!-- file: docs/tutorial/arm/13-weld.uritp -->
```uritp
# Welding a seam: with the arm's own adaptive weld if it has one, plain welding if not.
robot arm = connect("lab:arm-1")

move arm.tool to places.seam_start.above(5cm)
if arm.has("examplecorp.adaptive_weld"):
    examplecorp.adaptive_weld(route.seam, current=120A)
else:
    weld along route.seam speed 5mm/s current 120A
weld along route.seam speed 5mm/s current 100A
move arm.tool to places.seam_end.above(15cm)
```

```bash
npm run uritp -- run docs/tutorial/arm/13-weld.uritp --robot docs/tutorial/robots/workshop.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
arm <- MOVE frame=tool target=pose(0.5,-0.1,0.07,3.14159265359,0,0)
arm -> succeeded
arm <- EXT name=examplecorp.adaptive_weld seam=[pose(0.5,-0.1,0.02,3.14159265359,0,0),pose(0.5,0.1,0.02,3.14159265359,0,0)] current=120
arm -> succeeded
arm <- SKILL name=weld path=[pose(0.5,-0.1,0.02,3.14159265359,0,0),pose(0.5,0.1,0.02,3.14159265359,0,0)] speed=0.005 current=100
arm -> succeeded
arm <- MOVE frame=tool target=pose(0.5,0.1,0.17,3.14159265359,0,0)
arm -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `weld` | `weld along ROUTE speed SPEED current CURRENT` welds along a route. Needs the `tooling` profile. |
| `along` | With `weld`: the route to weld along. |
| `current` | With `weld`: the electric current to weld with, in amperes, like `120A`. |

- `arm.has("examplecorp.adaptive_weld")` is true when the robot's manifest
  lists that **extension**, and false when it does not. `examplecorp` is a
  made-up company name.
- `examplecorp.adaptive_weld(route.seam, current=120A)` uses the extension.
  `current=120A` is a **named input**: it says which input the value is for.
- Putting an extension inside `if ROBOT.has(...)`, with plain URITP in the
  `else` part, lets the same program run on robots with and without it.
  Without the `if`, you get warning W601.

## 14. Flying

<!-- file: docs/tutorial/14-fly.uritp -->
```uritp
# A drone takes off, photographs and sprays the kitchen from above, then lands at the dock.
robot drone = connect("lab:drone-1")

takeoff drone to 5m
move drone.base to places.kitchen.at_height(3m)
capture drone.camera save as "kitchen_from_above.jpg"
spray drone.sprayer on places.kitchen amount 20ml
land drone at places.dock
```

```bash
npm run uritp -- run docs/tutorial/14-fly.uritp --robot docs/tutorial/robots/drone.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
drone <- SKILL name=takeoff height=5
drone -> succeeded
drone <- MOVE frame=base target=pose(4,1,3,0,0,0)
drone -> succeeded
drone <- SENSE sensor=camera save="kitchen_from_above.jpg"
drone -> succeeded
drone <- SKILL name=spray actuator=sprayer target=pose(4,1,0,0,0,0) amount=0.02
drone -> succeeded
drone <- SKILL name=land at=pose(0,0,0,0,0,0)
drone -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `takeoff` | `takeoff ROBOT to HEIGHT` makes a flying robot take off and rise to that height. Needs the `flight` profile. |
| `land` | `land ROBOT` lands where it is; `land ROBOT at PLACE` flies there and lands. |
| `at` | With `land`: where to land. |
| `spray` | `spray PART on TARGET amount VOLUME` sprays from a sprayer. Needs the `tooling` profile. |
| `amount` | With `spray`: how much to spray, like `20ml`. |

`places.kitchen.at_height(3m)` is the kitchen, 3 metres up. A flying robot
needs this, because the places in a site map are on the ground.

Flying robots have safety rules of their own:

<!-- file: docs/tutorial/14-fly-safely.uritp -->
```uritp
# The same flight with safety rules that bring the drone home or land it.
robot drone = connect("lab:drone-1")

safety:
    return_home drone when drone.battery < 25%
    land at places.dock when drone.battery < 15%

takeoff drone to 5m
for point in route.rounds:
    move drone.base to point.at_height(4m)
land drone at places.dock
```

```bash
npm run uritp -- run docs/tutorial/14-fly-safely.uritp --robot docs/tutorial/robots/drone.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
drone <- SKILL name=takeoff height=5
drone -> succeeded
drone <- MOVE frame=base target=pose(4,1,4,0,0,0)
drone -> succeeded
drone <- MOVE frame=base target=pose(2,3,4,0,0,0)
drone -> succeeded
drone <- MOVE frame=base target=pose(0,3.5,4,0,0,0)
drone -> succeeded
drone <- SKILL name=land at=pose(0,0,0,0,0,0)
drone -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `return_home` | Only in safety rules: the flying robot flies back to where it took off, and the program ends. |

## 15. Several robots at once

<!-- file: docs/tutorial/15-two-robots.uritp -->
```uritp
# Two robots working at the same time.
robot big = connect("lab:rover-1")
robot small = connect("lab:rover-2")

parallel:
    move big.base to places.kitchen
    drive small.base forward by 1m
log "both robots have finished"
```

Give each robot its manifest by name, with `--robot NAME=FILE`:

```bash
npm run uritp -- run docs/tutorial/15-two-robots.uritp --robot big=manifests/raspberry-pi/pi-rover.uritp --robot small=manifests/arduino/arduino-rover.uritp
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

**New words**

| Word | What it means |
|---|---|
| `parallel` | `parallel:` runs every line of its block at the same time, and waits until all of them have finished. Each line should use a different robot. |

Both instructions start together, and the small rover's short drive finishes
first. Only when both are done does the program go on to the `log` line.
Without names, manifests go to the robots in the order the program connects
them.

## 16. Bigger programs

### 16.1 Places of your own, in the program

<!-- file: docs/tutorial/16-define.uritp -->
```uritp
# A program can name its own places with define, next to the ones in the site map.
robot rover = connect("lab:rover-1")

define place printer = pose(1m, 2m, 0m)
define place window  = pose(3m, 3m, 0m)

for spot in [places.printer, places.window]:
    move rover.base to spot
move rover.base to places.dock
```

```bash
npm run uritp -- run docs/tutorial/16-define.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(1,2,0,0,0,0)
rover -> succeeded
rover <- MOVE frame=base target=pose(3,3,0,0,0,0)
rover -> succeeded
rover <- MOVE frame=base target=pose(0,0,0,0,0,0)
rover -> succeeded
The program ended: succeeded.
```

`define` lines can go in a program as well as in a site map. They must be at
the left edge.

### 16.2 Sharing tasks between programs

A file can hold tasks for other programs to use:

<!-- file: docs/tutorial/16-helpers.uritp -->
```uritp
# Tasks to share between programs. A task file has no robot of its own: robots come in as inputs.
task wiggle(who, how_many):
    repeat how_many times:
        turn who.base by 30deg
        turn who.base by -30deg

task photo_at(who, spot):
    move who.base to spot
    capture who.camera save as "{spot.name}.jpg"
```

<!-- file: docs/tutorial/16-import.uritp -->
```uritp
# Uses the tasks in 16-helpers.uritp, brought in with import.
import "16-helpers.uritp"
robot rover = connect("lab:rover-1")

photo_at(rover, places.kitchen)
wiggle(rover, 2)
photo_at(rover, places.dock)
```

```bash
npm run uritp -- run docs/tutorial/16-import.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
Simulated robots only. Nothing is sent to real hardware.
rover <- MOVE frame=base target=pose(4,1,0,0,0,0)
rover -> succeeded
rover <- SENSE sensor=camera save="kitchen.jpg"
rover -> succeeded
rover <- TURN frame=base angle=0.523598775598
rover -> succeeded
rover <- TURN frame=base angle=-0.523598775598
rover -> succeeded
rover <- TURN frame=base angle=0.523598775598
rover -> succeeded
rover <- TURN frame=base angle=-0.523598775598
rover -> succeeded
rover <- MOVE frame=base target=pose(0,0,0,0,0,0)
rover -> succeeded
rover <- SENSE sensor=camera save="dock.jpg"
rover -> succeeded
The program ended: succeeded.
```

**New words**

| Word | What it means |
|---|---|
| `import` | `import "FILE"` brings in the tasks and `define` lines of another file. That file can hold only `task`, `define` and `import` lines. |

A task file has no robots of its own, so its tasks take the robot as an
input, like `wiggle(rover, 2)`.

### 16.3 A robot's own language

<!-- file: docs/tutorial/16-native.uritp -->
```uritp
# native runs code in a robot's own language. No URITP 0.1 robot accepts it, so this is refused.
robot rover = connect("lab:rover-1")

native("python", "print('hello')")
```

```bash
npm run uritp -- check docs/tutorial/16-native.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

```text
E405 (line 4): no URITP 0.1 robot accepts native code
  Fix: Use a URITP statement or a vendor extension instead.
W602 (line 4): native code works on only one kind of robot, so this program is not portable
  Fix: Use a URITP statement, profile or extension instead where you can.
1 error(s), 1 warning(s).
```

**New words**

| Word | What it means |
|---|---|
| `native` | `native("LANGUAGE", "CODE")` would send code in a robot's own language. It always gets warning W602, because it works on only one kind of robot, and no URITP 0.1 robot accepts it (E405). Use URITP statements or an extension instead. |

## 17. Coding for the playground sandboxes

Everything so far works with any robot that has a manifest. This chapter is
about one particular place to use it: the **URITP playground**, a website
with five ready-made worlds, each with its own robots, to code in.

### 17.1 What the playground is

The playground is a separate project (github.com/senthuran2107/URITP). It
runs URITP in your browser, with its own checker, called **ElaraCheck**, and
draws the robots moving. Its **Sandbox** tab has five worlds:

| World | Robot | What is there |
|---|---|---|
| Kitchen | a robot arm | a red ball, a blue cube and a cup; a basket, a plate and a shelf to put them in; a stove and a cat's bed to keep away from |
| Town | a delivery rover | a home, a shop, a school, a park and a post office; a pond to drive round; a flower bed to keep off |
| Warehouse | a cart | three aisles between racks, a packing table, a loading bay and an office; a forklift lane |
| Farm | a drone | six plants in two rows, a pad to take off from, a barn and a pond; beehives it must not fly over |
| Factory | a welder and a picker | a steel plate, a jig to weld it in, a rack and a bin; seams to weld; a guard zone where people stand |

To code in a sandbox:

1. Open the playground. It is published as a website, or you can run it on
   your own computer from its project folder with
   `python tools/playground_dev.py` and open http://localhost:8000/?engine=local.
2. Tap the **Sandbox** tab, then the world you want.
3. Replace the starter program in the editor with your own.
4. Press **▶ Run**. ElaraCheck checks the program first, exactly like `check`
   in this tutorial. If it finds a problem, it shows the error code and
   line, and nothing moves. Otherwise the robots move on screen.
5. **Share** puts your program in a link; **Record** saves a video clip.

### 17.2 How every sandbox program starts

Each world has a map and robots of its own. The first lines of a program say
which world and which robots, and must be written exactly like this:

| World | First lines |
|---|---|
| Kitchen | `import "kitchen.uritp"` and `robot arm = connect("play:arm")` |
| Town | `import "town.uritp"` and `robot rover = connect("play:rover")` |
| Warehouse | `import "warehouse.uritp"` and `robot cart = connect("play:cart")` |
| Farm | `import "farm.uritp"` and `robot drone = connect("play:drone")` |
| Factory | `import "factory.uritp"`, `robot welder = connect("play:welder")` and `robot picker = connect("play:picker")` |

`import` (chapter 16) brings in the world's map, so `places.shelf` or
`route.delivery` mean something. The text in `connect` is the address of the
playground's robot. You may change the names `arm`, `rover` and so on, but
not the addresses.

### 17.3 Writing code that works in both

The playground's URITP and this project's URITP are two versions of the same
language, and a few small things differ. Follow these rules and your program
works in both:

- **Do not use URITP words as names.** The playground lets you write
  `for stop in route.delivery:`; this URITP does not, because `stop` is one
  of its words. Write `for spot in route.delivery:`. The words are listed in
  [A. Every word of URITP](#a-every-word-of-uritp).
- **Put `on fail:` last in its block.** To protect one risky line, put it in
  a task with its own `on fail:`, as the warehouse example below does.
- **To log values, separate them with commas**: `log error.code, error.reason`.
  The playground does not fill in `{...}` inside `log` text (`say` is fine).
- **Write safety rules without a robot name**: `stop when ...`,
  `alert when ...`, `return_home when ...`. The playground does not accept a
  robot name or an alert message in a rule.
- **Pick things up with `move` and `grip`**, not `pick` and `place`. In the
  playground, the things are named in the map (like `places.red_ball`), and
  `pick` here needs a thing the robot finds with a camera.
- In the playground, moving takes no time: only `wait` moves the clock on, so
  `now()` only grows during a `wait`.

### 17.4 Checking a sandbox program here

The folder [sandboxes/](../sandboxes/) has a copy of each world's map and the
playground robots' manifests, in `sandboxes/robots/`, so you can check a
program here before pasting it into the playground:

```bash
npm run uritp -- check sandboxes/kitchen/06-set-the-table.uritp --robot sandboxes/robots/play_arm.uritp
```

```text
No problems found.
```

The copied maps leave out two kinds of line that only the playground knows:
`define floor` (the area a robot must stay inside) and `define obstacle`
(things a robot drives round, like the pond and the racks). The playground
still keeps to them.

### 17.5 The kitchen

The arm stands at `pose(0m, 0m, 0m)` and reaches 0.85m. Its parts are
`arm.tool` (its hand) and `arm.gripper` (up to 60N). It can also `say`
things. Its manifest forbids it to enter the stove and the cat's bed. It
starts with its hand at `pose(0.35m, 0m, 0.3m)`.

<!-- file: sandboxes/kitchen/kitchen.uritp -->
```uritp
# Copied from the URITP playground's world (github.com/senthuran2107/URITP, MIT licence).
# The Kitchen table: the playground arm stands at pose(0m, 0m, 0m).
# Things start at these places; the arm can reach 0.85m and starts at pose(0.35m, 0m, 0.3m).
define place red_ball  = pose(0.55m, 0.25m, 0.04m)
define place blue_cube = pose(0.6m, -0.15m, 0.03m)
define place cup       = pose(0.05m, 0.6m, 0.05m)
define place basket    = pose(0.25m, -0.5m, 0.06m)
define place plate     = pose(0.6m, -0.45m, 0.01m)
define place shelf     = pose(-0.5m, 0m, 0.12m)
define place cat_bed   = pose(-0.45m, 0.5m, 0m)
define place stove     = pose(-0.45m, -0.5m, 0m)
define zone  cat_bed   = polygon(pose(-0.7m,0.3m,0m), pose(-0.2m,0.3m,0m), pose(-0.2m,0.7m,0m), pose(-0.7m,0.7m,0m))
define zone  stove     = polygon(pose(-0.7m,-0.7m,0m), pose(-0.2m,-0.7m,0m), pose(-0.2m,-0.3m,0m), pose(-0.7m,-0.3m,0m))
```

- `places.red_ball`, `places.blue_cube` and `places.cup` are where the three
  **things** start.
- The basket, the plate and the shelf are **holders**: a thing let go above
  one lands in it.
- `grip arm.gripper close` catches a thing when the hand is just above it
  (within 8cm to the side). The usual way is `move arm.tool to THING.above(10cm)`
  first.

<!-- file: sandboxes/kitchen/06-set-the-table.uritp -->
```uritp
# Sets the table: the ball in the basket, the cube on the plate, the cup on the shelf.
import "kitchen.uritp"
robot arm = connect("play:arm")

task carry(thing, where):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to where.above(10cm)
    grip arm.gripper open
    say "{thing.name} done"

carry(places.red_ball, places.basket)
carry(places.blue_cube, places.plate)
carry(places.cup, places.shelf)
```

**Things to try:** `sandboxes/kitchen/` has 14 more kitchen programs, such as
`15-speed-and-repeat.uritp`, which sets the arm's speed and repeats a task.

### 17.6 The town

The rover starts at home, `pose(1m, 1m, 0m)`, in a town 10m by 7m. Its parts
are `rover.base` and `rover.tray`. It can `say` things. Its manifest forbids
the flower bed, and the playground steers it round the pond by itself.

<!-- file: sandboxes/town/town.uritp -->
```uritp
# Copied from the URITP playground's world (github.com/senthuran2107/URITP, MIT licence).
# Left out: its define floor and define obstacle lines, which this URITP does not have yet.
# The playground still keeps robots off the floor's edge and out of the obstacles.
# The Town: the playground rover starts at home, pose(1m, 1m, 0m).
define place home        = pose(1m, 1m, 0m)
define place shop        = pose(8.6m, 1.2m, 0m)
define place school      = pose(8.6m, 5.8m, 0m)
define place park        = pose(1.2m, 5.8m, 0m)
define place post_office = pose(5m, 6.2m, 0m)
define zone flowers      = polygon(pose(0.3m,2.6m,0m), pose(2.3m,2.6m,0m), pose(2.3m,4.2m,0m), pose(0.3m,4.2m,0m))
define route delivery    = [places.shop, places.post_office, places.school]
```

<!-- file: sandboxes/town/02-delivery-round.uritp -->
```uritp
# Delivers to every stop on the delivery route, says so at each, and comes home.
import "town.uritp"
robot rover = connect("play:rover")

for spot in route.delivery:
    move rover.base to spot
    say "{spot.name} delivered"
move rover.base to places.home
```

```bash
npm run uritp -- check sandboxes/town/02-delivery-round.uritp --robot sandboxes/robots/play_rover.uritp
```

```text
No problems found.
```

**Things to try:** drive a square with `drive` and `turn`, as in chapter 6,
or visit the park keeping off the flowers with `avoid zones.flowers`.

### 17.7 The warehouse

The cart starts at its dock, `pose(1m, 1m, 0m)`. Its parts are `cart.base`
and `cart.tray`, and it has a `distance_front` sensor. It can `say` things.
The racks are obstacles the playground steers round, and the forklift lane
is a zone you can `avoid`.

The warehouse's simulator does a few things on purpose, so programs can react:

- **Aisle C is blocked today:** every move to `places.aisle_c` fails (R703).
- **The distance sensor** gives 2.4m, 1.1m, 60cm, 30cm, 12cm, then 1.8m, one
  reading after another.
- **The tray** is loaded on the third reading of `cart.tray.loaded`.
- **The battery** reads 85%, then 70%, 55% and so on, 15% less each time.

<!-- file: sandboxes/warehouse/warehouse.uritp -->
```uritp
# Copied from the URITP playground's world (github.com/senthuran2107/URITP, MIT licence).
# Left out: its define floor and define obstacle lines, which this URITP does not have yet.
# The playground still keeps robots off the floor's edge and out of the obstacles.
# The Warehouse: the playground cart starts at its charging dock, pose(1m, 1m, 0m).
# Racks are obstacles (a floor robot never drives into them); the forklift lane is a zone you can
# tell a move to avoid. Aisle C is blocked today (the cart's .sim file makes moves there fail).
define place dock     = pose(1m, 1m, 0m)
define place packing  = pose(8m, 1m, 0m)
define place loading  = pose(8m, 5m, 0m)
define place aisle_a  = pose(2.6m, 4.2m, 0m)
define place aisle_b  = pose(4.6m, 4.2m, 0m)
define place aisle_c  = pose(6.6m, 4.2m, 0m)
define place office   = pose(1m, 5m, 0m)
define zone forklift  = polygon(pose(4.1m,0m,0m), pose(4.9m,0m,0m), pose(4.9m,1.9m,0m), pose(4.1m,1.9m,0m))
define route picking  = [places.aisle_a, places.aisle_b, places.packing]
```

<!-- file: sandboxes/warehouse/05-blocked-aisle.uritp -->
```uritp
# Tries aisle C, which is blocked today, and goes to aisle B instead when that fails.
import "warehouse.uritp"
robot cart = connect("play:cart")

task fetch_from_c():
    move cart.base to places.aisle_c
    say "Got it from aisle C."
    on fail:
        log error.code, error.reason
        say "Aisle C is blocked. Trying aisle B."
        move cart.base to places.aisle_b

fetch_from_c()
move cart.base to places.packing
    avoid zones.forklift
```

```bash
npm run uritp -- check sandboxes/warehouse/05-blocked-aisle.uritp --robot sandboxes/robots/play_cart.uritp
```

```text
No problems found.
```

**Things to try:** wait to be loaded with
`wait until cart.tray.loaded timeout 10s`, then take the load to packing.

### 17.8 The farm

The drone waits on its pad, `pose(1.2m, 1.2m, 0m)`. Its parts are
`drone.base`, `drone.sprayer` and `drone.camera`, and it has a `height`
sensor. It can fly, take photos, spray and `say` things. Its manifest
forbids it to fly over the beehives. The places are on the ground, so fly to
them with `.at_height(...)`. The battery goes down from 90%, by 5% with
every reading.

<!-- file: sandboxes/farm/farm.uritp -->
```uritp
# Copied from the URITP playground's world (github.com/senthuran2107/URITP, MIT licence).
# The Farm: the playground drone waits on its pad, pose(1.2m, 1.2m, 0m). Places are on the ground;
# fly to them with .at_height(...). The beehives are a no-fly zone for the drone.
define place pad    = pose(1.2m, 1.2m, 0m)
define place barn   = pose(1.4m, 6.6m, 0m)
define place pond   = pose(10.6m, 1.6m, 0m)
define place p1     = pose(4m, 3m, 0m)
define place p2     = pose(6m, 3m, 0m)
define place p3     = pose(8m, 3m, 0m)
define place p4     = pose(4m, 5.6m, 0m)
define place p5     = pose(6m, 5.6m, 0m)
define place p6     = pose(8m, 5.6m, 0m)
define zone beehives = polygon(pose(9.8m,5m,0m), pose(11.6m,5m,0m), pose(11.6m,7.4m,0m), pose(9.8m,7.4m,0m))
define route row_1  = [places.p1, places.p2, places.p3]
define route row_2  = [places.p6, places.p5, places.p4]
define route all_plants = [places.p1, places.p2, places.p3, places.p6, places.p5, places.p4]
```

<!-- file: sandboxes/farm/05-photo-and-spray.uritp -->
```uritp
# For each plant in row 1: a photo first, then 20ml of spray.
import "farm.uritp"
robot drone = connect("play:drone")

takeoff drone to 3m
for plant in route.row_1:
    move drone.base to plant.at_height(2m)
    capture drone.camera save as "{plant.id}.jpg"
    spray drone.sprayer on plant amount 20ml
land drone at places.pad
```

```bash
npm run uritp -- check sandboxes/farm/05-photo-and-spray.uritp --robot sandboxes/robots/play_drone.uritp
```

```text
No problems found.
```

**Things to try:** add `safety:` with `return_home when drone.battery < 25%`,
and photograph all six plants with `route.all_plants`.

### 17.9 The factory

There are two arms on one bench. The **welder** stands at `pose(-0.55m, 0m, 0m)`.
Its part is `welder.tool`, it has a `temperature` sensor, it can `weld`, and
it has the extension `examplecorp.adaptive_weld`. It cannot `say` anything.
The **picker** stands at `pose(0.7m, 0m, 0m)`. Its parts are `picker.tool`
and `picker.gripper`, and it can `say` things. Both reach 0.85m, and neither
may enter the guard zone. The steel plate starts on the rack. The jig, the
bin and the rack are holders. The welder's temperature reads 24, then 31,
then 48 degrees Celsius.

<!-- file: sandboxes/factory/factory.uritp -->
```uritp
# Copied from the URITP playground's world (github.com/senthuran2107/URITP, MIT licence).
# The Factory bench: the welder stands at pose(-0.55m, 0m, 0m) and the picker at pose(0.7m, 0m, 0m).
# Each reaches 0.85m. The seams are where two steel plates meet; the guard zone is where people stand.
define place rack    = pose(1.2m, 0.45m, 0.02m)
define place jig     = pose(0.05m, 0m, 0.03m)
define place bin     = pose(1.25m, -0.45m, 0.05m)
define place plate   = pose(1.2m, 0.45m, 0.02m)
define place s1      = pose(-0.12m, -0.12m, 0.04m)
define place s2      = pose(0.22m, -0.12m, 0.04m)
define place s3      = pose(0.22m, 0.12m, 0.04m)
define place s4      = pose(-0.12m, 0.12m, 0.04m)
define zone  guard   = polygon(pose(-0.4m,0.55m,0m), pose(0.5m,0.55m,0m), pose(0.5m,0.8m,0m), pose(-0.4m,0.8m,0m))
define route seam    = [places.s1, places.s2]
define route frame   = [places.s1, places.s2, places.s3, places.s4, places.s1]
```

<!-- file: sandboxes/factory/07-at-the-same-time.uritp -->
```uritp
# Once the plate is in the jig, the welder welds while the picker moves out of the way.
import "factory.uritp"
robot welder = connect("play:welder")
robot picker = connect("play:picker")

move picker.tool to places.plate.above(10cm)
grip picker.gripper close
move picker.tool to places.jig.above(10cm)
grip picker.gripper open
parallel:
    weld along route.frame speed 5mm/s current 120A
    move picker.tool to places.bin.above(10cm)
say "Done, and nobody waited."
```

With two robots, give each its manifest by name:

```bash
npm run uritp -- check sandboxes/factory/07-at-the-same-time.uritp --robot welder=sandboxes/robots/play_welder.uritp --robot picker=sandboxes/robots/play_picker.uritp
```

```text
No problems found.
```

**Things to try:** weld with the welder's own adaptive weld when it has one:
`if welder.has("examplecorp.adaptive_weld"):`, as in chapter 13.

### 17.10 More sandbox programs

[sandboxes/README.md](../sandboxes/README.md) lists all 67 ready-made
programs, at least 13 for each world, with one line on what each does. They
all run in the playground and pass this URITP's checker. Open a file, copy
it, and paste it into the matching sandbox.

## 18. From words to programs

URITP can also be written by a **translator** from what people say. Someone
says "rasoi mein jao" ("go to the kitchen" in Hinglish), and a translator
turns it into:

```
move rover.base to places.kitchen
```

The offline translator knows a few dozen phrases in English, Hindi and
Hinglish. The AI translator understands much more, but needs an API key; in
this version it is part of the project's code and not yet available from the
command line or the demo. Whatever a translator writes goes through exactly
the same checks as the programs in this tutorial, so a wrong or unsafe
translation never moves a robot.

To try the offline translator in a browser, typing or speaking requests to a
simulated rover:

```bash
npm run demo
```

---

# Part 3: Reference

## A. Every word of URITP

These words belong to URITP and cannot be used as names.

| Word | What it means | Example | Chapter |
|---|---|---|---|
| `alert` | Sends a message to the people in charge; also a safety rule action | `alert "Battery low"` | 12, 10 |
| `along` | With `weld`: the route to weld along | `weld along route.seam speed 5mm/s current 120A` | 13 |
| `amount` | With `spray`: how much | `spray drone.sprayer on places.kitchen amount 20ml` | 14 |
| `and` | True only when both sides are true | `if charged and far < 5m:` | 5 |
| `as` | Part of `save as` | `capture rover.camera save as "door.jpg"` | 13 |
| `ask` | Asks a question and stores the answer (only in `let`) | `let dish = ask "What shall I bring?"` | 12 |
| `at` | With `land`: where to land | `land drone at places.dock` | 14 |
| `avoid` | With `move`: never enter this zone | `move rover.base to places.kitchen avoid zones.stairs` | 4 |
| `backward` | With `drive`: go backwards | `drive rover.base backward by 20cm` | 2 |
| `break` | Leaves a loop at once | `break` | 6 |
| `by` | How far to drive, or how much to turn | `turn rover.base by 90deg` | 2 |
| `capture` | Takes a photo | `capture rover.camera save as "a.jpg"` | 13 |
| `close` | With `grip`: close and hold on | `grip arm.gripper close` | 8 |
| `confirm` | Asks a yes-or-no question; no stops the program safely | `confirm "Shall I go?"` | 12 |
| `connect` | Where to find a robot | `robot rover = connect("lab:rover-1")` | 2 |
| `current` | With `weld`: the welding current | `current 120A` | 13 |
| `define` | Names a place, zone or route | `define place printer = pose(1m, 2m, 0m)` | 4, 16 |
| `drive` | Moves straight forward or back | `drive rover.base forward by 50cm` | 2 |
| `elif` | "else if": checked when everything above was false | `elif front < 1m:` | 5 |
| `else` | Runs when nothing above was true | `else:` | 5 |
| `every` | `repeat every TIME`: once every so often | `repeat every 10s:` | 6 |
| `fail` | Part of `on fail` | `on fail:` | 9 |
| `false` | The value "no" | `let in_a_hurry = false` | 3 |
| `for` | Once for each item of a list | `for point in route.rounds:` | 6 |
| `force` | With `grip ... close`: the most to squeeze | `grip arm.gripper close force 30N` | 8 |
| `forever` | `repeat forever`: until `break` or a stop | `repeat forever:` | 6 |
| `forward` | With `drive`: go the way the robot faces | `drive rover.base forward by 1m` | 2 |
| `from` | With `pour`: the thing to pour from | `pour from kettle into mug until mug.fill >= 80%` | 8 |
| `grip` | Opens or closes a gripper | `grip arm.gripper open` | 8 |
| `if` | Runs a block only when a condition is true | `if front < 30cm:` | 5 |
| `import` | Brings in the tasks and places of another file | `import "16-helpers.uritp"` | 16 |
| `in` | In a `for` line, before the list | `for spot in route.rounds:` | 6 |
| `into` | With `pour`: the thing to pour into | `pour from kettle into mug until mug.fill >= 80%` | 8 |
| `land` | Lands a flying robot; also a safety rule action | `land drone at places.dock` | 14, 10 |
| `lang` | The language of a message | `say "नमस्ते" lang hi` | 12 |
| `let` | Gives a value a name | `let step = 50cm` | 3 |
| `log` | Writes values into the program's record | `log "battery", rover.battery` | 3 |
| `move` | Moves a part to a target | `move rover.base to places.kitchen` | 4 |
| `native` | Code in a robot's own language (refused in URITP 0.1) | `native("python", "...")` | 16 |
| `not` | Turns true into false and back | `if not charged:` | 5 |
| `on` | Where to put or spray something; part of `on fail` | `place cup on places.bin_b using arm.tool` | 8, 9 |
| `onto` | With `pick`: which part to hold the thing with | `pick cup using arm onto arm.tool` | 8 |
| `open` | With `grip`: open and let go | `grip arm.gripper open` | 8 |
| `or` | True when at least one side is true | `if not charged or far >= 5m:` | 5 |
| `parallel` | Runs lines at the same time | `parallel:` | 15 |
| `pick` | Finds a thing, grips it and lifts it | `pick cup using arm` | 8 |
| `place` | Puts a held thing down; also `define place` | `place cup on places.bin_b using arm.tool` | 8, 4 |
| `pour` | Pours from one thing into another | `pour from kettle into mug until mug.fill >= 80%` | 8 |
| `repeat` | Runs a block again and again | `repeat 4 times:` | 6 |
| `return` | Ends a task and gives back a value | `return a` | 7 |
| `return_home` | Safety rule: the flying robot flies back home | `return_home when drone.battery < 25%` | 14, 10 |
| `robot` | Connects a robot and names it | `robot rover = connect("lab:rover-1")` | 2 |
| `safety` | Starts a block of safety rules | `safety:` | 10 |
| `save` | Part of `save as` | `capture rover.camera save as "a.jpg"` | 13 |
| `say` | The robot speaks to the people near it | `say "Hello!"` | 12 |
| `speed` | How fast to move | `move rover.base to places.desk speed 0.25m/s` | 3 |
| `spray` | Sprays from a sprayer | `spray drone.sprayer on places.kitchen amount 20ml` | 14 |
| `stop` | Stops a robot; also a safety rule action | `stop rover` | 9, 10 |
| `takeoff` | A flying robot takes off | `takeoff drone to 5m` | 14 |
| `task` | Defines a task | `task visit(spot):` | 7 |
| `times` | `repeat N times` | `repeat 3 times:` | 6 |
| `timeout` | The longest a `wait until` waits | `wait until rover.battery > 50% timeout 10s` | 6 |
| `to` | Where to go | `move rover.base to places.kitchen` | 4 |
| `tolerance` | How close counts as arrived | `move rover.base to places.door tolerance 5cm` | 4 |
| `true` | The value "yes" | `let lights_on = true` | 3 |
| `turn` | Turns on the spot | `turn rover.base by 90deg` | 2 |
| `until` | The condition to wait for (`wait`, `pour`) | `wait until rover.battery > 50% timeout 10s` | 6, 8 |
| `using` | Which robot or part does it | `pick cup using arm` | 8 |
| `via` | Pass through a route's places on the way | `move rover.base to places.door via route.rounds` | 4 |
| `wait` | Pauses for a time, or until something is true | `wait 2s` | 6 |
| `weld` | Welds along a route | `weld along route.seam speed 5mm/s current 120A` | 13 |
| `when` | In a safety rule: the condition | `stop rover when rover.battery < 20%` | 10 |

These words are only special inside a manifest, so you may use them as names
in a program:

| Word | What it means | Chapter |
|---|---|---|
| `manifest` | Starts a manifest | 11 |
| `uritp` | The URITP version the robot understands | 11 |
| `frame` | A part that moves | 11 |
| `actuator` | A part with fixed positions, like a gripper | 11 |
| `sensor` | Something that measures | 11 |
| `profiles` | The groups of things the robot can do | 11 |
| `extension` | A special ability of one kind of robot | 11, 13 |

## B. Built-in functions and values

These names are built in, so you cannot use them as names either:
`places`, `zones`, `route`, `field`, `shelf`, `error`, `pose`, `polygon`,
`distance`, `now`, `len`, `round`, `text`.

### Functions

| Function | Gives | Example |
|---|---|---|
| `pose(x, y, z)` | a position; add `roll=`, `pitch=` or `yaw=` angles to turn it | `pose(1m, 2m, 0m, yaw=90deg)` |
| `polygon(p1, p2, p3, ...)` | an area with three or more corners | `polygon(pose(0m, 0m, 0m), pose(1m, 0m, 0m), pose(1m, 1m, 0m))` |
| `distance(a, b)` | the straight-line distance between two places, poses or things | `distance(places.dock, places.door)` |
| `now()` | how long the program has been running | `if now() >= 30min:` |
| `len(list)` | how many items a list has | `len([places.kitchen, places.door])` is `2` |
| `round(amount, unit)` | an amount rounded to a whole number of a unit | `round(2.66m, cm)` is `266cm` |
| `to(amount, unit)` | an amount shown in another unit | `to(1.5m, cm)` is `150cm` |
| `text(value)` | a value as text | `text(5cm)` is `"5cm"` |

### Names for the site map

| Name | Means |
|---|---|
| `places.NAME` | a place from the site map, like `places.kitchen` |
| `zones.NAME` | a zone from the site map, like `zones.stairs` |
| `route.NAME` | a route from the site map, like `route.rounds` |
| `field`, `shelf` | reserved for field maps and warehouse shelves, which URITP 0.1 does not have yet |
| `error` | inside `on fail:`, what went wrong: `error.code` and `error.reason` |

### Helpers, written after a place, a pose or a thing

| Helper | Gives |
|---|---|
| `.above(LENGTH)` | higher by that much, with the hand pointing down |
| `.below(LENGTH)` | lower by that much |
| `.at_height(LENGTH)` | the same spot at exactly that height |
| `.offset(X, Y, Z)` | moved by three lengths: east, north and up |
| `.beside(LENGTH)` | to the side by that much |
| `.in_front(LENGTH)` | in front by that much |
| `.level(N)` | the Nth level of a shelf-like thing |

### Properties, written after a dot

| Property | Of | Gives |
|---|---|---|
| `.battery` | a robot | how full its battery is, as a percent |
| `.state` | a robot | what it is doing, as text, like `"idle"` |
| `.pose` | a robot | where it is |
| `.has("NAME")` | a robot | true if it has that profile or extension |
| `.sense("SENSOR")` | a robot | a reading from that sensor |
| `.value`, `.max`, `.min`, `.mean` | a reading | the measured value, and the largest, smallest and average |
| `.timestamp` | a reading | when it was measured |
| `.name`, `.id` | a place or a thing | its name, as text |
| `.fill` | a thing | how full it is, as a percent |
| `.handle` | a place or a thing | the point to grip it by |
| `.holding`, `.loaded`, `.locked` | a part with positions, like a gripper or a tray | true or false |
| `.analyse("WHAT")` | a camera | what it sees, with `.label` and `.health` (needs `vision`) |
| `.code`, `.reason` | `error`, inside `on fail:` | the failure's code and its reason |

## C. Units

| Kind | Units | Sent to the robot as |
|---|---|---|
| Length | `mm` `cm` `m` `km` | metres |
| Angle | `deg` `rad` | radians |
| Time | `ms` `s` `min` `h` | seconds |
| Speed | `mm/s` `cm/s` `m/s` `km/h` | metres per second |
| Turning speed | `deg/s` `rad/s` | radians per second |
| Mass | `g` `kg` | kilograms |
| Force | `N` | newtons |
| Electric current | `A` | amperes |
| Volume | `ml` `l` | litres |
| Temperature | `deg_c` | degrees Celsius |
| Percent | `%` | a fraction: `80%` is sent as `0.8` |

Write each unit exactly as shown, with no space after the number: `20cm`,
`0.5m/s`, `80deg_c`.

## D. Every error message

Every message starts with a code. Errors stop the program before anything moves; warnings (W) are shown but let it run; R codes happen while it runs and can be handled with `on fail:`.

### E1xx: syntax

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

### E2xx: names

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

### E3xx: types and units

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

### E4xx: capabilities

| Code | Meaning | Example that triggers it |
|---|---|---|
| E401 | a command needs a profile the robot does not have (§8) | `takeoff rover to 2m` on a rover with `[core, navigation]` |
| E402 | a vendor extension no connected robot has | `examplecorp.adaptive_weld(...)` on a rover |
| E403 | a statement that names no robot, which more than one robot could run (D18, D27) | `say "hi"` with two robots that can speak |
| E404 | a statement that names no robot, which no connected robot can run (D27) | `say "hi"` with only robots that cannot speak |
| E405 | native code, which no URITP 0.1 robot accepts (D20) | `native("urscript", "...")` |
| E406 | a fixed speed faster than the frame can move (its `max_speed`) | `speed 3m/s` on a frame with `max_speed 1m/s` |
| E407 | a fixed force more than the actuator can apply (its `max_force`) | `force 200N` on a gripper with `max_force 140N` |
| E408 | `grip` asking for a state the actuator does not have | `grip rover.tray close` on a tray with states `[empty, loaded]` |

### E409 and E42x: what a driver refuses

| Code | Meaning | Example |
|---|---|---|
| E409 | the robot has no part with that name | `ACTUATE actuator=gripper` sent to a rover |
| E421 | a target beyond the reach of the frame | an arm with reach 850mm asked to go 1.2m away |
| E422 | a target a frame on the floor cannot take | a rover base asked to go to a height of 1m |
| E423 | a value finer than the robot can do exactly | 12.3mm for a robot that moves in whole millimetres |

### E41x: problems in a manifest

| Code | Meaning | Example that triggers it |
|---|---|---|
| E410 | no `uritp` line, or a version other than 0.1 | `uritp 0.2` |
| E411 | no `profiles` line, or one without `core` | `profiles [navigation]` |
| E412 | a profile that does not exist | `profiles [core, navigaton]` |
| E413 | a frame type other than pose2d, pose3d or pose6d | `frame base: pose4d` |
| E414 | a value with the wrong kind of unit | `max_speed 1.5m` |
| E415 | the same entry listed twice | two `frame base:` lines |
| E416 | a sensor dimension that does not exist | `dimension Lenght` |
| E417 | an extension parameter type that does not exist | `seam: Path` |
| E418 | an extension name that breaks the naming rule | `extension ExampleCorp.Weld(...)`, `extension navigation.boost()` |
| E419 | a forbidden zone that is not `zones.NAME` or a fixed polygon | `safety forbidden_zone cup` |

### E5xx: safety

| Code | Meaning | Example that triggers it |
|---|---|---|
| E501 | a fixed target inside a zone the robot's manifest forbids | `move rover.base to places.icu_bed` |
| E502 | a fixed speed above the robot's safety limit (§8) | `speed 3m/s` with `safety max_speed 1.5m/s` |
| E503 | a forbidden zone named in a manifest that the site map does not define | `safety forbidden_zone zones.icu` with no zone `icu` |

### W6xx: portability warnings

| Code | Meaning | Example that triggers it |
|---|---|---|
| W601 | a vendor extension used without a `.has(...)` guard (§7) | `examplecorp.adaptive_weld(...)` outside `if welder.has(...)` |
| W602 | native code, which makes a program non-portable (§7) | `native("urscript", "...")` |

### R7xx: failures while running

| Code | Meaning | Example |
|---|---|---|
| R701 | the robot refused an instruction straight away (§9.3 rule 4) | `turn was refused by 'rover': E401 cannot turn` |
| R702 | `wait until` reached its timeout | `waited 2min but the condition did not become true` |
| R703 | a task failed while running (§8) | `move failed: path blocked at places.corridor_2` |
| R704 | the robot broke the task lifecycle (§9.3 rule 3, D35) | a robot that reports succeeded without accepted and running |
| R705 | a value could not be worked out while running | a worked-out percent of 110% (D12) |
| R706 | it is not clear which robot should do something (D27, D30) | reading `mug.fill` with two robots that can see |
| R707 | a robot connection or imported file is missing | no connection for robot `rover` |

## E. Common mistakes

| You wrote | What is wrong | Write instead |
|---|---|---|
| `drive rover.base forward by 50` | no unit (E304) | `50cm` |
| `turn rover.base by 90 deg` | a space before the unit (E111) | `90deg` |
| `speed 5mms` | not a unit (E110) | `5mm/s` |
| `if x < 3` | missing `:` at the end (E101) | `if x < 3:` |
| a block indented by 2 spaces, or by a Tab | indentation must be exactly 4 spaces (E102, E103) | 4 spaces |
| `say "hello` | text with no closing quote (E112) | `say "hello"` |
| a long `say "..."` split over two lines | text must stay on one line (E112) | keep it on one line |
| `let step = 10cm` twice in the same block | a name gets a value only once (E207) | a new name, like `step_2` |
| `for stop in route.rounds:` | `stop` is a URITP word (E123) | `for spot in route.rounds:` |
| `let shelf = ...` | `shelf` is a built-in name (E208) | `let my_shelf = ...` |
| `if a = b:` | one `=` is only for `let` | `if a == b:` |
| `move rover.base to places.kitchn` | no such place (E209) | check the site map |
| `say "..."` on a robot without `speech` | the robot cannot (E401) | another robot, or `log` |
| `speed 1m/s` on a robot whose limit is 0.3m/s | over the safety limit (E502) | at most `0.3m/s` |
| `on fail:` in the middle of a block | it must come last (E128) | move it to the end, or into a task |
| copying code from a PDF | lines get split and spaces at the start are lost | copy from the `.uritp` file |

## F. A program to start from

```
# What this program does, in one line.
robot NAME = connect("ADDRESS")

safety:
    stop when NAME.battery < 10%

let SPEED = 0.2m/s

task JOB(INPUT):
    move NAME.base to INPUT speed SPEED
    on fail:
        log "could not do JOB: {error.reason}"

JOB(places.PLACE)
```

Replace the words in capitals, run `check` until it says "No problems
found.", then `run` it.
