<!-- Company: Universal Robots -->
# Universal Robots driver

A reference driver that runs URITP instructions on a **simulated** Universal
Robots arm. It writes each instruction as URScript-style text.

- **Not tested on real hardware.** It was written from public documentation.
  It runs in simulator mode only: the URScript lines are recorded, and
  nothing is sent to a robot.
- **Values are illustrative.** The acceleration, the stopping deceleration,
  the stopping time (0.5 s) and the repeatability (0.03 mm) are typical
  public figures. Replace them with datasheet values before any real use.
- This project is not affiliated with, certified by or endorsed by
  Universal Robots.

## What each instruction becomes

| Instruction | URScript-style text |
|---|---|
| `MOVE frame=tool target=... speed=0.2` | `movel(p[x, y, z, rx, ry, rz], a=1.2, v=0.2)`, one per `via` point first |
| `ACTUATE actuator=gripper state=closed force=40` | `gripper_close(force=40.0)` |
| `ACTUATE actuator=gripper state=open` | `gripper_open()` |
| `SKILL name=pick object=cup` | move above, move down, `gripper_close()`, move up |
| `SKILL name=place target=... frame=tool` | move to the target, `gripper_open()` |
| other skills, like `pour` | `uritp_pour(...)`: a helper function written for the work cell |
| `SENSE sensor=force` / `pose` / `state` | `get_tcp_force()` / `get_actual_tcp_pose()` / `is_steady()` |
| `WAIT duration=2` | `sleep(2.0)` |
| STOP | `stopl(3.0)` |

Poses are written as URScript does: metres, with the orientation as a
rotation vector. A tool pointing straight down (`.above(...)`) is
`rx = 3.14159`.

## What it refuses

It refuses, with a reason, anything the arm cannot do exactly or must not
do:
- driving, speaking or flying (it only has `core` and `manipulation`);
- a target beyond the 850mm reach;
- a speed over 0.25m/s, or a grip force over 100N;
- a target in a forbidden zone;
- native URScript (spec/DECISIONS.md D20).

It finds an object only if the simulation knows where it is. A real
cell would need a vision system to do that.

## Files

- `ur-driver.ts`: the driver.
- `urscript.ts`: rotation vectors and number formatting.
- `ur-driver.test.ts`: its tests.
