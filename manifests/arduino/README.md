<!-- Company: Arduino -->
# Arduino manifest

`arduino-rover.uritp` describes a small wheeled rover driven by an Arduino
board, with one distance sensor at the front.

- **Not tested on real hardware.** It is a reference written from public
  documentation, used in simulator mode only.
- **Values are illustrative.** An Arduino rover is built from parts chosen by
  its maker, so speeds and payload depend on your motors and wheels. Replace
  them with datasheet values for your own build.
- This project is not affiliated with, certified by or endorsed by Arduino.

| Entry | Value | Why |
|---|---|---|
| `frame base` | pose2d, max_speed 0.3m/s, payload 0.5kg | a small rover moves on the floor |
| `sensor distance_front` | ultrasonic, Length | a distance sensor facing forward |
| `profiles` | core, navigation | a microcontroller rover drives and turns; it has no camera, gripper or speaker |
| `safety max_speed` | 0.2m/s | slow enough for a small rover on a desk or floor |
