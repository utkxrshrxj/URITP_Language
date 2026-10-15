# Companies

URITP has reference drivers for exactly three companies' hardware. This file is
updated in the same commit as any change to company code.

## Honesty statement

- We have no hardware. Every driver is a reference implementation built from
  public documentation and runs in simulator mode.
- No driver has been tested on real hardware.
- This project has no partnership with, certification from, or endorsement by
  any of these companies. Their names are used only to say which hardware a
  driver is written for.
- Values in the manifests are illustrative. Replace them with datasheet values
  before using a driver with a real robot.

## Rules for company code

- Everything for one company lives in its own folders:
  `drivers/<company>/` and `manifests/<company>/`.
- Shared code (`src/`, `drivers/shared/`) never mentions a company name.
- Every company file starts with the comment line `Company: <name>`.
- Commits that touch company code name the company in the message, for example
  "Added gripper open and close for Universal Robots as URScript".

## The three companies

| Company | Robot type | Driver folder | Manifest folder | Driver speaks | Status |
|---|---|---|---|---|---|
| Universal Robots | Industrial arm (manipulation) | `drivers/universal-robots/` | `manifests/universal-robots/` | URScript-style text | Manifest and simulated driver done |
| Raspberry Pi | Rover or robot built on a Pi (navigation, vision) | `drivers/raspberry-pi/` | `manifests/raspberry-pi/` | Command messages for a motor and camera service | Manifest and simulated driver done |
| Arduino | Small microcontroller rover (core and navigation only) | `drivers/arduino/` | `manifests/arduino/` | Simple serial text protocol | Manifest and simulated driver done |

## What every driver shares

The parts that are the same for every robot live in `drivers/shared/`, which
never names a company (spec/DECISIONS.md D38, D39):

- `driver.ts`: the shape of a driver: it runs one instruction at a time as a
  task, says how quickly it stops, and records each line it would send.
- `checks.ts`: what a driver refuses before doing anything, whatever the
  program checker said: missing profiles or parts, speeds and forces over
  the limits, targets out of reach or in a forbidden zone, and anything it
  cannot do exactly.
- `simulator.ts` and `paths.ts`: the simulated world that carries out each
  instruction exactly, planning straight lines only.
- `base-driver.ts`: reports `accepted`, `running`, then one final state, and
  obeys STOP from any state.

A company driver only adds how instructions are written in its robot's own
language, and its own stopping time and repeatability. The test
`tests/company-files.test.ts` checks, without naming a company, that:
- every company file starts with a `Company:` line;
- every driver README says "not tested on real hardware" and "simulator
  mode only";
- every company has both a driver and a manifest;
- shared driver code names no company.

## The companies one by one

Each section below lists its files, its manifest and driver, how its commits
are worded, and what is real versus simulated.

## Universal Robots

- **Folders:** `manifests/universal-robots/` and `drivers/universal-robots/`.
- **Files:**
  - `manifests/universal-robots/ur-arm.uritp`: the arm's manifest.
  - `manifests/universal-robots/README.md`: what each value means and where it comes from.
  - `manifests/universal-robots/manifest.test.ts`: checks the manifest and that programs are accepted or rejected against it.
  - `drivers/universal-robots/ur-driver.ts`: the simulated driver, writing URScript-style text.
  - `drivers/universal-robots/urscript.ts`: URScript poses (rotation vectors) and numbers.
  - `drivers/universal-robots/README.md`: what each instruction becomes, and what it refuses.
  - `drivers/universal-robots/index.ts`: the entry point the command line and conformance tests use to create the driver.
  - `drivers/universal-robots/ur-driver.test.ts`: the driver's tests, including running `examples/try-arm/pick_and_place.uritp` through the command line.
- **Driver:** moves become `movel(p[...], a=1.2, v=...)`, grips become
  `gripper_close(...)` and `gripper_open()`, and STOP becomes `stopl(3.0)`.
  Stopping time 0.5 s, repeatability 0.03 mm.
- **Manifest:** one `tool` frame (pose6d, reach 850mm, max_speed 1m/s,
  payload 5kg), a `gripper` actuator (open/closed, max_force 100N), a `force`
  sensor, profiles `[core, manipulation]`, and `safety max_speed 0.25m/s`.
- **Commits are worded** with the company name in the sentence, for example
  "Added a reference arm manifest for Universal Robots".
- **Real versus simulated:** everything is simulated, and nothing has been
  tested on real hardware. The driver records the URScript-style lines it
  would send, but sends nothing. The values are typical public figures,
  marked "replace with datasheet values". `gripper_open` and `gripper_close`
  stand for the functions of whichever gripper is fitted, since the arm has
  none of its own. Objects are found only if the simulation knows where they
  are; a real cell would need a vision system. Native URScript is not
  accepted (DECISIONS.md D20).

## Raspberry Pi

- **Folders:** `manifests/raspberry-pi/` and `drivers/raspberry-pi/`.
- **Files:**
  - `manifests/raspberry-pi/pi-rover.uritp`: the rover's manifest.
  - `manifests/raspberry-pi/README.md`: what each value means and where it comes from.
  - `manifests/raspberry-pi/manifest.test.ts`: checks the manifest and that programs are accepted or rejected against it.
  - `drivers/raspberry-pi/pi-driver.ts`: the simulated driver and its JSON command messages.
  - `drivers/raspberry-pi/README.md`: what each instruction becomes, and what it refuses.
  - `drivers/raspberry-pi/index.ts`: the entry point the command line and conformance tests use to create the driver.
  - `drivers/raspberry-pi/pi-driver.test.ts`: the driver's tests.
- **Driver:** each instruction becomes JSON command messages for `motors`,
  `camera`, `sensors` and `system` services on the Pi, such as
  `{"service":"motors","command":"go_to",...}`. STOP sends
  `{"service":"motors","command":"stop"}`. Stopping time 0.3 s, repeatability 1 cm.
- **Manifest:** one `base` frame (pose2d, max_speed 0.5m/s, payload 1kg), a
  `camera` sensor, a `distance_front` sensor (Length), profiles
  `[core, navigation, vision]`, and `safety max_speed 0.3m/s`.
- **Commits are worded** with the company name in the sentence, for example
  "Added a reference rover manifest for Raspberry Pi".
- **Real versus simulated:** everything is simulated, and nothing has been
  tested on real hardware. The driver records the messages it would send,
  but sends nothing; the services they are addressed to are a suggested
  design, not existing software. A Pi rover is built from parts its maker
  chooses, so the values are illustrative and marked "replace with
  datasheet values".

## Arduino

- **Folders:** `manifests/arduino/` and `drivers/arduino/`.
- **Files:**
  - `manifests/arduino/arduino-rover.uritp`: the rover's manifest.
  - `manifests/arduino/README.md`: what each value means and where it comes from.
  - `manifests/arduino/manifest.test.ts`: checks the manifest and that programs are accepted or rejected against it.
  - `drivers/arduino/arduino-driver.ts`: the simulated driver.
  - `drivers/arduino/serial-protocol.ts`: the serial lines and whole-number conversions.
  - `drivers/arduino/README.md`: the protocol, and what it refuses.
  - `drivers/arduino/index.ts`: the entry point the command line and conformance tests use to create the driver.
  - `drivers/arduino/arduino-driver.test.ts`: the driver's tests.
- **Driver:** each instruction becomes short serial lines in whole
  millimetres and hundredths of a degree: `F 500 100`, `L 9000 2865`,
  `Q DF`. A move to a pose is turn, drive straight, turn. STOP sends `S`.
  Stopping time 0.2 s, repeatability 5 mm.
- **Manifest:** one `base` frame (pose2d, max_speed 0.3m/s, payload 0.5kg),
  a `distance_front` sensor (Length), profiles `[core, navigation]` only, and
  `safety max_speed 0.2m/s`.
- **Commits are worded** with the company name in the sentence, for example
  "Added a reference rover manifest for Arduino".
- **Real versus simulated:** everything is simulated, and nothing has been
  tested on real hardware. The driver records the serial lines it would
  send, but no serial port is opened; the protocol is a suggested design for
  the rover's sketch, not existing firmware. An Arduino rover is built from
  parts its maker chooses, so the values are illustrative and marked
  "replace with datasheet values".
