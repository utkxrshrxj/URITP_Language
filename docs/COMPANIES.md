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
| Universal Robots | Industrial arm (manipulation) | `drivers/universal-robots/` | `manifests/universal-robots/` | URScript-style text | Manifest done; driver in Phase 6 |
| Raspberry Pi | Rover or robot built on a Pi (navigation, vision) | `drivers/raspberry-pi/` | `manifests/raspberry-pi/` | Command messages for a motor and camera service | Manifest done; driver in Phase 6 |
| Arduino | Small microcontroller rover (core and navigation only) | `drivers/arduino/` | `manifests/arduino/` | Simple serial text protocol | Manifest done; driver in Phase 6 |

Each company's section below lists its files, its manifest, how its commits
are worded, and what is real versus simulated.

## Universal Robots

- **Folders:** `manifests/universal-robots/` (driver in `drivers/universal-robots/` from Phase 6).
- **Files:**
  - `ur-arm.uritp`: the arm's manifest.
  - `README.md`: what each value means and where it comes from.
  - `manifest.test.ts`: checks the manifest and that programs are accepted or rejected against it.
- **Manifest:** one `tool` frame (pose6d, reach 850mm, max_speed 1m/s,
  payload 5kg), a `gripper` actuator (open/closed, max_force 100N), a `force`
  sensor, profiles `[core, manipulation]`, and `safety max_speed 0.25m/s`.
- **Commits are worded** with the company name in the sentence, for example
  "Added a reference arm manifest for Universal Robots".
- **Real versus simulated:** everything is simulated. The values are typical
  public figures, marked "replace with datasheet values". The gripper is an
  assumption, since the arm has none of its own. Native URScript is not
  accepted (DECISIONS.md D20).

## Raspberry Pi

- **Folders:** `manifests/raspberry-pi/` (driver in `drivers/raspberry-pi/` from Phase 6).
- **Files:**
  - `pi-rover.uritp`: the rover's manifest.
  - `README.md`: what each value means and where it comes from.
  - `manifest.test.ts`: checks the manifest and that programs are accepted or rejected against it.
- **Manifest:** one `base` frame (pose2d, max_speed 0.5m/s, payload 1kg), a
  `camera` sensor, a `distance_front` sensor (Length), profiles
  `[core, navigation, vision]`, and `safety max_speed 0.3m/s`.
- **Commits are worded** with the company name in the sentence, for example
  "Added a reference rover manifest for Raspberry Pi".
- **Real versus simulated:** everything is simulated. A Pi rover is built
  from parts its maker chooses, so the values are illustrative and marked
  "replace with datasheet values".

## Arduino

- **Folders:** `manifests/arduino/` (driver in `drivers/arduino/` from Phase 6).
- **Files:**
  - `arduino-rover.uritp`: the rover's manifest.
  - `README.md`: what each value means and where it comes from.
  - `manifest.test.ts`: checks the manifest and that programs are accepted or rejected against it.
- **Manifest:** one `base` frame (pose2d, max_speed 0.3m/s, payload 0.5kg),
  a `distance_front` sensor (Length), profiles `[core, navigation]` only, and
  `safety max_speed 0.2m/s`.
- **Commits are worded** with the company name in the sentence, for example
  "Added a reference rover manifest for Arduino".
- **Real versus simulated:** everything is simulated. An Arduino rover is
  built from parts its maker chooses, so the values are illustrative and
  marked "replace with datasheet values".
