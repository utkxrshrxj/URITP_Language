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
| Universal Robots | Industrial arm (manipulation) | `drivers/universal-robots/` | `manifests/universal-robots/` | URScript-style text | Not started (Phase 6) |
| Raspberry Pi | Rover or robot built on a Pi (navigation, vision) | `drivers/raspberry-pi/` | `manifests/raspberry-pi/` | Command messages for a motor and camera service | Not started (Phase 6) |
| Arduino | Small microcontroller rover (core and navigation only) | `drivers/arduino/` | `manifests/arduino/` | Simple serial text protocol | Not started (Phase 6) |

Each company's section below will list its files, its manifest, how its
commits are worded, and what is real versus simulated, once its code exists.
