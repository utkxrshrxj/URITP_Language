# How URITP works

This guide follows one request from the moment someone speaks to the moment a
robot moves. You do not need to know anything about programming to read it.

## The idea in one sentence

You ask a robot for something in your own language. URITP turns your words
into a short, exact program, checks that the program is possible and safe for
that robot, and only then lets the robot move.

Think of a travel plug adapter: your device does not change, the adapter makes
it fit any socket. URITP is that adapter between people and robots.

## The whole journey at a glance

```
 "rasoi mein jao"                         what a person says or types
        │
        ▼
 1. Translator     ──►  move rover.base to places.kitchen        a URITP program
        │
        ▼
 2. Reading        ──►  the program's words and their structure
        │
        ▼
 3. Checking       ──►  names, units, abilities, safety          stop here if anything is wrong
        │
        ▼
 4. Instructions   ──►  MOVE frame=base target=pose(4,1,0,0,0,0)  numbers in metres and seconds
        │
        ▼
 5. Runner         ──►  one instruction at a time, watching each one
        │
        ▼
 6. Driver         ──►  the robot's own language                  simulated, never real hardware
```

## Step 1: understanding the request

Someone says "rasoi mein jao" ("go to the kitchen" in Hinglish). A
**translator** turns those words into a line of URITP, the robot language:

```
move rover.base to places.kitchen
```

There are two translators:

- The **offline translator** knows a few dozen phrases in English, Hindi and
  Hinglish, like "go to the kitchen", "रसोई में जाओ", "50 cm aage chalo" or
  "laal gend uthao aur tokri mein rakho" (pick up the red ball and put it in
  the basket). It needs no internet. If it does not recognise something, it
  says so plainly instead of guessing.
- The **AI translator** uses an AI model (Claude) and understands much more.
  It only works with an API key, a password for the AI service, which is
  never stored in the project.

Either way, the translator is never trusted. Everything it writes goes
through the same checks as a program written carefully by hand.

## Step 2: reading the program

URITP programs are written to be read by people too: one instruction per
line, with units always written next to numbers (`50cm`, `0.2m/s`, `90deg`).

The computer first cuts the program into words, much as you might split a
sentence into words. Then it works out the structure, which word belongs to
which instruction. If the program is written wrongly (a missing `:`, a
misspelled unit like `5mms`), you get a message with a code, the line, what is
wrong in plain words, and a suggested fix:

```
E110 (line 6): 'mms' is not a unit
  Fix: Did you mean 5mm/s?
```

## Step 3: checking before anything moves

This is the heart of URITP. Before any motor turns, the program is checked
against:

- **The robot's manifest**, a short file in which each robot describes itself:
  its parts (a base, an arm, a gripper, a camera), what it can do (drive, grip,
  see, speak), and its safety limits (a top speed, places it must never go).
- **The site map**, which names the places in a building, like `kitchen` or
  `dock`, and zones to keep out of.

The checker asks questions like:

- Does this robot have that part? A rover has no gripper.
- Are the units right? You cannot add 10 centimetres to 2 seconds.
- Can this robot do this at all? A wheeled rover cannot take off.
- Is it safe? Is the speed under the limit? Is the target outside every
  forbidden zone?

If anything is wrong, the program is **rejected** with the reason, and the
robot never receives anything. For example:

```
E502 (line 2): speed 3m/s exceeds safety limit 0.3m/s for 'rover'
  Fix: Use a speed of at most 0.3m/s. A program can never switch safety limits off.
```

Messages can be shown in English or in Hindi. The codes are the same in both,
so a problem is easy to look up in any language.

## Step 4: turning the program into instructions

A checked program is turned into **instructions**: the only thing a robot ever
receives. Every number is converted into standard units (metres, seconds,
radians), so no robot has to convert anything:

```
MOVE frame=base target=pose(4,1,0,0,0,0)
```

## Step 5: running, one instruction at a time

The **runner** does the program's thinking: loops ("repeat 3 times"),
decisions ("if the path is blocked"), and reusable tasks. It sends the robot
one instruction at a time and watches each one go through the same steps:

1. **accepted**: the robot has taken the instruction;
2. **running**: it is working on it;
3. then exactly one of **succeeded**, **failed** (with a reason) or
   **cancelled**.

If something fails, the program can say what to do instead (`on fail:`), for
example go back to a safe place. If nothing handles it, every robot stops
safely and the person is told why.

Safety is watched the whole time:

- **STOP** works at any moment, from any state. Pressing Ctrl+C on the
  command line, or a safety rule, stops every robot at once.
- **Safety rules** written in the program, like "return home when the battery
  is below 25%", are checked again and again while it runs.
- A robot also checks every instruction against its own limits, even though
  the checker already did. A program can never switch safety off.

## Step 6: the robot's own language

Each kind of robot speaks its own language, so a **driver** translates the
instructions one last time:

| Robot | What its driver writes |
|---|---|
| Universal Robots arm | URScript-style text, like `movel(p[0.4, 0.1, 0.15, 3.141593, 0.0, 0.0], a=1.2, v=0.2)` |
| Raspberry Pi rover | Messages, like `{"service":"motors","command":"go_to","x":4,"y":1,...}` |
| Arduino rover | Short serial lines, like `F 500 100` (forward 500 mm at 100 mm/s) |

**Important:** we have no real robots. Every driver here works in **simulator
mode only**. It writes down exactly what it would send, but sends nothing to
real hardware, and none of them has been tested on a real robot. The numbers
in the manifests are illustrative and must be replaced with real datasheet
values before any real use. This project is not affiliated with, certified by
or endorsed by any of these companies.

## Checking the drivers themselves

The Guidebook lists ten rules a robot must follow to be called
URITP-compatible: accept every instruction it claims to, report the steps of
every task, refuse what it cannot do exactly, obey STOP, keep its own safety
limits, use standard units, and more. The **conformance tests** check each of
the three simulated drivers against all ten rules. They also check a
deliberately careless driver, to show the tests really catch problems.

## Trying it yourself

On a computer with Node.js 20 or newer, in the project folder:

```bash
npm install
```

```bash
npm run build
```

Check a program against a robot's manifest. This one is meant for a rover
with a gripper, so the checker explains, line by line, why this smaller rover
cannot do it:

```bash
npm run uritp -- check examples/02-office-delivery-rover/delivery.uritp --robot manifests/raspberry-pi/pi-rover.uritp
```

Add `--lang hi` to any command to see the messages in Hindi.

See the exact instructions a program turns into, in standard units:

```bash
npm run uritp -- compile examples/try-arm/pick_and_place.uritp --robot manifests/universal-robots/ur-arm.uritp
```

Run a program on a simulated robot, showing each instruction as it happens and
what the robot's driver would send. There is one ready-to-run program for each
kind of robot:

```bash
npm run uritp -- run examples/try-arm/pick_and_place.uritp --robot manifests/universal-robots/ur-arm.uritp --protocol
```

```bash
npm run uritp -- run examples/try-camera-rover/rounds.uritp --robot manifests/raspberry-pi/pi-rover.uritp --protocol
```

```bash
npm run uritp -- run examples/try-small-rover/drive_until_close.uritp --robot manifests/arduino/arduino-rover.uritp --protocol
```

Programs run at real speed. Add `--speed 10` to run ten times faster, and
press Ctrl+C at any moment to stop every robot.

Or open the browser demo, where you can type or speak a request:

```bash
npm run demo
```

## Words used in this guide

| Word | Meaning |
|---|---|
| URITP | The common robot language, and the rules for using it. |
| Program | A short list of instructions written in URITP. |
| Manifest | A robot's description of itself: parts, abilities and safety limits. |
| Site map | The named places and zones of a building. |
| Checker | The part that checks a program before anything moves. |
| Instruction | One exact step sent to a robot, with numbers in standard units. |
| Driver | The part that speaks one kind of robot's own language. |
| Simulator | Software that pretends to be a robot, so nothing real can break. |
