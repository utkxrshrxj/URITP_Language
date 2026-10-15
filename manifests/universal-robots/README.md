<!-- Company: Universal Robots -->
# Universal Robots manifest

`ur-arm.uritp` describes a Universal Robots e-Series style industrial arm for URITP.

- **Not tested on real hardware.** It is a reference written from public
  documentation, used in simulator mode only.
- **Values are illustrative.** Reach, speeds, payload and force are typical
  public figures, not taken from a specific datasheet. Replace them with
  datasheet values before using a real robot.
- **The gripper is an assumption.** The arm has no gripper of its own; the
  `gripper` actuator stands for a two-finger gripper fitted to the tool flange.
- This project is not affiliated with, certified by or endorsed by Universal Robots.

| Entry | Value | Why |
|---|---|---|
| `frame tool` | pose6d, reach 850mm, max_speed 1m/s, payload 5kg | the tool flange moves in full 3D |
| `actuator gripper` | open / closed, max_force 100N | an assumed two-finger gripper |
| `sensor force` | wrench, Force | e-Series arms have a force/torque sensor at the tool |
| `profiles` | core, manipulation | an arm grips, picks and places; it cannot drive, speak or see |
| `safety max_speed` | 0.25m/s | a low speed for working near people; set this from a risk assessment |

`native` URScript is not accepted (spec/DECISIONS.md D20), even though the arm's
own language is URScript.
