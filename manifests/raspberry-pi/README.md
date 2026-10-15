<!-- Company: Raspberry Pi -->
# Raspberry Pi manifest

`pi-rover.uritp` describes a small wheeled rover built on a Raspberry Pi board,
with a camera and a distance sensor at the front.

- **Not tested on real hardware.** It is a reference written from public
  documentation, used in simulator mode only.
- **Values are illustrative.** A Pi rover is built from parts chosen by its
  maker, so speeds and payload depend on your motors and wheels. Replace them
  with datasheet values for your own build.
- This project is not affiliated with, certified by or endorsed by Raspberry Pi.

| Entry | Value | Why |
|---|---|---|
| `frame base` | pose2d, max_speed 0.5m/s, payload 1kg | a rover moves on the floor (x, y and rotation) |
| `sensor camera` | rgb | a camera for `capture` |
| `sensor distance_front` | ultrasonic, Length | a distance sensor facing forward |
| `profiles` | core, navigation, vision | it drives, turns, follows routes and takes photos; it cannot grip, fly or speak |
| `safety max_speed` | 0.3m/s | slow enough for a small rover indoors |
