<!-- Company: Arduino -->
# Arduino driver

A reference driver that runs URITP instructions on a **simulated** small
wheeled rover run by an Arduino board. It writes each instruction as lines of
a simple serial text protocol.

- **Not tested on real hardware.** It was written from public documentation.
  It runs in simulator mode only: the lines are recorded, and nothing is
  sent over a serial port. The protocol is a suggested design for the
  rover's sketch (its program), not existing firmware.
- **Values are illustrative.** The stopping time (0.2 s) and repeatability
  (5 mm) depend on the motors and wheels you choose. Replace them with
  datasheet values for your own build.
- This project is not affiliated with, certified by or endorsed by Arduino.

## The serial protocol

One line per command, ending in a newline. Numbers are whole numbers, so the
board never needs decimals: millimetres, millimetres per second, and
hundredths of a degree.

| Line | Meaning |
|---|---|
| `F 500 100` | drive forward 500 mm at 100 mm/s |
| `B 500 100` | drive backward 500 mm at 100 mm/s |
| `F - 100` | drive forward until stopped |
| `L 9000 2865` | turn left (anticlockwise) 90° at 28.65°/s |
| `R 4500 2865` | turn right (clockwise) 45° |
| `Q DF` | ask for the distance in front, answered in mm |
| `Q BAT`, `Q ST`, `Q POS` | ask for the battery, the state, the position |
| `S` | stop at once |

A `MOVE` to a pose becomes: turn to face it, drive straight to it, then turn
to its heading. A route adds one such leg per point. Writing values in whole
millimetres differs from the exact value by at most 0.5 mm, well below the
rover's 5 mm repeatability, so the motion is the same (spec/DECISIONS.md D39).

## What it refuses

It refuses, with a reason, anything the rover cannot do exactly or must not
do:
- photos, gripping, speech or flight (it has only `core` and `navigation`);
- going to an object like `cup`, since it has no camera to find one;
- a target above the floor or tilted;
- a speed over 0.2m/s;
- a target in a forbidden zone.

## Files

- `arduino-driver.ts`: the driver.
- `serial-protocol.ts`: the protocol's lines and number conversions.
- `arduino-driver.test.ts`: its tests.
