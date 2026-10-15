<!-- Company: Raspberry Pi -->
# Raspberry Pi driver

A reference driver that runs URITP instructions on a **simulated** wheeled
rover built on a Raspberry Pi. It turns each instruction into JSON command
messages for small services on the Pi: `motors`, `camera`, `sensors` and
`system`.

- **Not tested on real hardware.** It was written from public documentation.
  It runs in simulator mode only: the messages are recorded, and nothing is
  sent to a Pi. The services they are addressed to are a suggested design,
  not existing software.
- **Values are illustrative.** The stopping time (0.3 s) and repeatability
  (1 cm) depend on the motors and wheels you choose. Replace them with
  datasheet values for your own build.
- This project is not affiliated with, certified by or endorsed by
  Raspberry Pi.

## What each instruction becomes

Each message is one line of JSON. Numbers are in metres, radians and seconds.

| Instruction | Message |
|---|---|
| `MOVE frame=base target=... speed=0.2` | `{"service":"motors","command":"go_to","x":5,"y":2,"heading":1.5708,"speed":0.2}`, one per `via` point first |
| `DRIVE frame=base distance=0.5` | `{"service":"motors","command":"drive","distance":0.5}` |
| `DRIVE frame=base direction=forward` | `{"service":"motors","command":"drive","direction":"forward"}`, until stopped |
| `TURN frame=base angle=1.5708` | `{"service":"motors","command":"turn","angle":1.5708}` |
| `SENSE sensor=camera save="a.jpg"` | `{"service":"camera","command":"capture","file":"a.jpg"}` |
| `SENSE sensor=distance_front` | `{"service":"sensors","command":"read","sensor":"distance_front"}` |
| `SENSE sensor=battery` | `{"service":"system","command":"read","value":"battery"}` |
| `SENSE sensor=cup.pose` | `{"service":"camera","command":"locate","object":"cup","property":"pose"}` |
| STOP | `{"service":"motors","command":"stop"}` |

## What it refuses

It refuses, with a reason, anything the rover cannot do exactly or must not
do:
- gripping, flying or speaking (it has `core`, `navigation` and `vision`);
- a target above the floor or tilted;
- a speed over 0.3m/s;
- a target in a forbidden zone;
- a tolerance finer than 1 cm.

It plans straight lines only. If the straight line to a target crosses a
zone it must avoid, the task fails with that reason. A `via` route can lead
it around the zone.

## Files

- `pi-driver.ts`: the driver and its command messages.
- `pi-driver.test.ts`: its tests.
