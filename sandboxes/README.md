# Programs for the URITP playground sandboxes

The [URITP playground](https://github.com/senthuran2107/URITP) has five sandbox
worlds: a robot arm in the kitchen, a rover in the town, a cart in the
warehouse, a drone on the farm, and a welder and a picker in the factory.
This folder has 13 programs for each world, 65 in all, written in this
project's URITP.

Every program here was checked both ways:

- **On the playground:** its own checker accepts it, the run ends as
  "finished", and the playground's scene confirms the program did its job
  (for example, the ball really is in the basket, or the drone really
  photographed p1, p2 and p3). No do-nothing program meets any of these goals.
- **Here:** this URITP's checker accepts it, against the playground robots'
  manifests. `tests/sandboxes.test.ts` checks this every time the tests run.

## Using a program in the playground

Open a sandbox, delete the starter program, and paste the program in. The
first lines (`import "kitchen.uritp"` and the `robot` lines) already match
the sandbox, so it runs as it is.

## Checking a program here

After `npm run build`, give each robot its manifest from `sandboxes/robots/`:

```bash
npm run uritp -- check sandboxes/kitchen/06-set-the-table.uritp --robot sandboxes/robots/play_arm.uritp
```

```bash
npm run uritp -- check sandboxes/factory/07-at-the-same-time.uritp --robot welder=sandboxes/robots/play_welder.uritp --robot picker=sandboxes/robots/play_picker.uritp
```

`run` works too, on this project's simpler simulator. It plans only straight
paths, so a move the playground steers round a pond or a flowerbed is refused
here instead (DECISIONS.md D38).

Each world folder has a copy of the playground's world map (like
`kitchen/kitchen.uritp`), and `robots/` has the playground robots'
manifests. They are copied from the playground (MIT licence, by Aditya Raj and
Senthuran Srimurugan) with two things left out that this URITP does not have
yet: `define floor` and `define obstacle` lines, and the welder's
`native [urscript]` line. Each file says what was left out.

## Where the two URITPs differ

The programs only use what both understand. While writing them, these
differences came up:

| Difference | What this URITP does now |
|---|---|
| A task's `on fail:` using the task's inputs | Adopted from the playground (DECISIONS.md D42) |
| `weld` on a welding arm with no gripper | Adopted: `weld` needs only `tooling` (D43) |
| Safety rules with no robot named, like `stop when ...` | Adopted: the robot may be named or left out (D44) |
| `on fail:` in the middle of a block | Not adopted: `on fail:` comes last in its block (C6) |
| `pick places.plate using picker onto places.jig` | Not adopted: `pick` takes an object the robot finds, as in the Guidebook; the programs move and grip instead |
| `stop`, `place` and `round` as names, like `for stop in route.delivery` | Not adopted: they are reserved words and a built-in here, so the programs use `spot` and `shift` |
| `"{len(things)}"` inside text | Not adopted: only names can be inserted into text (B6) |
| `define floor`, `define obstacle` in site maps | Proposed, not adopted (DECISIONS.md) |
| `native [urscript]` in a manifest | Proposed, not adopted (D20) |

One more: the playground's `log "{name}"` writes the braces as they are
instead of putting the value in. So these programs write `log name, value`,
which works the same in both.

## The programs

### The kitchen: the robot arm (`play:arm`)

| Program | What it does |
|---|---|
| [`01-hello.uritp`](kitchen/01-hello.uritp) | The kitchen arm says hello and points at each thing on the table. |
| [`02-ball-in-basket.uritp`](kitchen/02-ball-in-basket.uritp) | Picks up the red ball and drops it in the basket. |
| [`03-cube-on-plate.uritp`](kitchen/03-cube-on-plate.uritp) | Puts the blue cube on the plate, gently: slow near the table, and a soft grip. |
| [`04-cup-on-shelf.uritp`](kitchen/04-cup-on-shelf.uritp) | Puts the cup away on the shelf. The arm plans its own way round the cat's bed. |
| [`05-tidy-task.uritp`](kitchen/05-tidy-task.uritp) | One task, used three times: everything on the table goes into the basket. |
| [`06-set-the-table.uritp`](kitchen/06-set-the-table.uritp) | Sets the table: the ball in the basket, the cube on the plate, the cup on the shelf. |
| [`07-only-whats-close.uritp`](kitchen/07-only-whats-close.uritp) | Tidies only what is less than 1m from the basket; anything further stays where it is. |
| [`08-named-values.uritp`](kitchen/08-named-values.uritp) | The same job with named values, so the grip strength and lift height are easy to change. |
| [`09-distance-report.uritp`](kitchen/09-distance-report.uritp) | Measures how far each thing is from the basket and logs it, without moving anything. |
| [`10-swap.uritp`](kitchen/10-swap.uritp) | Moves the cube to the shelf, then changes its mind and puts it on the plate. |
| [`11-with-a-plan-b.uritp`](kitchen/11-with-a-plan-b.uritp) | Tidies the ball, and says so plainly if anything goes wrong on the way. |
| [`12-wave-goodbye.uritp`](kitchen/12-wave-goodbye.uritp) | The arm waves over the basket three times and says goodbye. |
| [`13-safety-rule.uritp`](kitchen/13-safety-rule.uritp) | Tidies the table with a safety rule on watch: the arm stops at once if its battery runs low. |

### The town: the delivery rover (`play:rover`)

| Program | What it does |
|---|---|
| [`01-hello-town.uritp`](town/01-hello-town.uritp) | The rover says hello, drives to the shop and comes back home. |
| [`02-delivery-round.uritp`](town/02-delivery-round.uritp) | Delivers to every stop on the delivery route, says so at each, and comes home. |
| [`03-fast-and-slow.uritp`](town/03-fast-and-slow.uritp) | Hurries to the shop at the speed limit, then comes home slowly. |
| [`04-square.uritp`](town/04-square.uritp) | Drives a square with 1m sides in front of home. |
| [`05-windmill.uritp`](town/05-windmill.uritp) | Four small squares, turning right after each one, so they make a windmill. |
| [`06-night-round.uritp`](town/06-night-round.uritp) | The night round: fast to far stops, slower to near ones, and never to the school, which is closed. |
| [`07-round-the-flowers.uritp`](town/07-round-the-flowers.uritp) | Goes to the park, keeping off the flowerbed on the way there and back. |
| [`08-grand-tour.uritp`](town/08-grand-tour.uritp) | Visits every building in town, says hello at each, and comes home. |
| [`09-how-far.uritp`](town/09-how-far.uritp) | Works out how far each stop is from home and logs it, without moving. |
| [`10-slalom.uritp`](town/10-slalom.uritp) | Weaves left and right along the road in front of home, like a slalom. |
| [`11-shopping-trip.uritp`](town/11-shopping-trip.uritp) | Goes to the shop, waits while it is loaded, then takes the shopping to the post office. |
| [`12-two-rounds.uritp`](town/12-two-rounds.uritp) | Does the delivery round twice, as a morning and an evening round. |
| [`13-safety-rules.uritp`](town/13-safety-rules.uritp) | The delivery round with safety rules: an alert below 30% battery, a full stop below 10%. |

### The warehouse: the cart (`play:cart`)

| Program | What it does |
|---|---|
| [`01-to-packing.uritp`](warehouse/01-to-packing.uritp) | The cart leaves its dock, goes to the packing table and comes back. |
| [`02-picking-round.uritp`](warehouse/02-picking-round.uritp) | Goes along the picking route, aisle by aisle, and ends at packing. |
| [`03-via-the-aisles.uritp`](warehouse/03-via-the-aisles.uritp) | Goes to the loading bay by way of the picking route, then back to the dock. |
| [`04-mind-the-forklift.uritp`](warehouse/04-mind-the-forklift.uritp) | Goes to packing and back without ever entering the forklift lane. |
| [`05-blocked-aisle.uritp`](warehouse/05-blocked-aisle.uritp) | Tries aisle C, which is blocked today, and goes to aisle B instead when that fails. |
| [`06-look-ahead.uritp`](warehouse/06-look-ahead.uritp) | Reads the distance sensor three times and says what it sees each time. |
| [`07-wait-for-load.uritp`](warehouse/07-wait-for-load.uritp) | Goes to the loading bay, waits up to 10s to be loaded, then takes the load to packing. |
| [`08-battery-check.uritp`](warehouse/08-battery-check.uritp) | Only starts the picking round if the battery is above half; otherwise it stays to charge. |
| [`09-creep-forward.uritp`](warehouse/09-creep-forward.uritp) | Creeps forward in small steps, and stops as soon as something is closer than 20cm. |
| [`10-office-errand.uritp`](warehouse/10-office-errand.uritp) | Takes a message to the office, waits a moment, and returns to the dock. |
| [`11-full-shift.uritp`](warehouse/11-full-shift.uritp) | A whole shift: fetch from three aisles (one is blocked), drop off at packing, go home. |
| [`12-sensor-log.uritp`](warehouse/12-sensor-log.uritp) | Logs the distance sensor once a second for three seconds. |
| [`13-dawn-round.uritp`](warehouse/13-dawn-round.uritp) | The dawn round: stops if anything gets within 15cm, copes with the blocked aisle C, waits to be loaded, and takes the load to packing round the forklift lane. |

### The farm: the drone (`play:drone`)

| Program | What it does |
|---|---|
| [`01-first-flight.uritp`](farm/01-first-flight.uritp) | The drone takes off, hovers over the field for a moment, and lands back on its pad. |
| [`02-one-photo.uritp`](farm/02-one-photo.uritp) | Flies 2m above plant p2, takes its photo, and lands. |
| [`03-row-one-photos.uritp`](farm/03-row-one-photos.uritp) | Photographs every plant in row 1, naming each photo after its plant. |
| [`04-spray-row-two.uritp`](farm/04-spray-row-two.uritp) | Sprays every plant in row 2 with 20ml. |
| [`05-photo-and-spray.uritp`](farm/05-photo-and-spray.uritp) | For each plant in row 1: a photo first, then 20ml of spray. |
| [`06-whole-farm.uritp`](farm/06-whole-farm.uritp) | Photographs all six plants, row by row, then lands. |
| [`07-barn-and-pond.uritp`](farm/07-barn-and-pond.uritp) | Checks on the barn and the pond from 5m up, with a photo of each. |
| [`08-height-check.uritp`](farm/08-height-check.uritp) | Takes off, reads its height sensor, and reports whether it is high enough to work. |
| [`09-battery-plan.uritp`](farm/09-battery-plan.uritp) | Only flies the full row if the battery is above half. |
| [`10-high-survey.uritp`](farm/10-high-survey.uritp) | A high survey: the whole farm photographed from 6m up. |
| [`11-spray-task.uritp`](farm/11-spray-task.uritp) | A task sprays one plant; it is used on two plants that need it. |
| [`12-safe-survey.uritp`](farm/12-safe-survey.uritp) | Surveys row 2, and lands safely on its pad if anything goes wrong on the way. |
| [`13-noon-round.uritp`](farm/13-noon-round.uritp) | The noon round: the drone goes home by itself if its battery drops below 25%. |

### The factory: the welder and the picker (`play:welder`, `play:picker`)

| Program | What it does |
|---|---|
| [`01-hello-factory.uritp`](factory/01-hello-factory.uritp) | Both arms get into position at the start of a shift, and the picker says hello. |
| [`02-plate-to-jig.uritp`](factory/02-plate-to-jig.uritp) | The picker takes the steel plate from the rack and puts it in the jig. |
| [`03-weld-a-seam.uritp`](factory/03-weld-a-seam.uritp) | The welder welds one seam, from s1 to s2. |
| [`04-weld-the-frame.uritp`](factory/04-weld-the-frame.uritp) | The welder welds all the way round the frame. |
| [`05-adaptive-weld.uritp`](factory/05-adaptive-weld.uritp) | Uses the welder's own adaptive weld when it has one, and plain welding when it does not. |
| [`06-load-and-weld.uritp`](factory/06-load-and-weld.uritp) | A full job: the picker loads the plate into the jig, then the welder welds the frame. |
| [`07-at-the-same-time.uritp`](factory/07-at-the-same-time.uritp) | Once the plate is in the jig, the welder welds while the picker moves out of the way. |
| [`08-check-the-heat.uritp`](factory/08-check-the-heat.uritp) | Reads the welder's temperature first, and only welds if it is cool enough. |
| [`09-temperature-watch.uritp`](factory/09-temperature-watch.uritp) | Reads the temperature three times, a second apart, and warns when it gets hot. |
| [`10-clear-the-jig.uritp`](factory/10-clear-the-jig.uritp) | After welding, the picker moves the finished plate from the jig into the bin. |
| [`11-shift-tasks.uritp`](factory/11-shift-tasks.uritp) | The shift as three tasks: load, weld (adaptive if possible), unload. |
| [`12-careful-loading.uritp`](factory/12-careful-loading.uritp) | Loads the plate, and lets go safely and says why if anything goes wrong on the way. |
| [`13-overheat-rule.uritp`](factory/13-overheat-rule.uritp) | Welds the frame with a safety rule watching the welder: everything stops if it overheats. |
