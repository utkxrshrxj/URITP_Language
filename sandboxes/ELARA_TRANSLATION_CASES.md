# Elara translation cases

Requests where Elara, the URITP playground's built-in translator, writes a program that runs but does not do
what the person asked, each with a corrected URITP program that does. Made from the playground at commit
`fa3646f` (github.com/senthuran2107/URITP).

- **34 requests** (37 wordings) where Elara's program does not do what was asked. Every corrected program does,
  checked on the playground's own engine and scene, and is in this repository next to its world's map.
- **10 requests** Elara gets right, checked the same way, are listed at the end.

A PDF of this report is made from the same data.

## Summary

| Case | Request | What went wrong | Corrected program |
|---|---|---|---|
| K1 | "keep red ball on the shelf and then keep blue cube also on the shelf keep them side by side not on top of the other" | landed on the same spot | [`request-k01-side-by-side-on-the-shelf.uritp`](kitchen/request-k01-side-by-side-on-the-shelf.uritp) |
| K2 | "laal gend ko shelf pe rakho aur neela dabba bhi shelf pe rakho, ek ke upar ek nahi" | landed on the same spot | [`request-k02-side-by-side-hinglish.uritp`](kitchen/request-k02-side-by-side-hinglish.uritp) |
| K3 | "put the cube on the plate, then put the ball on the plate too" | landed on the same spot | [`request-k03-both-on-the-plate.uritp`](kitchen/request-k03-both-on-the-plate.uritp) |
| K4 | "put the ball and the cube in the basket" | only one thing moved | [`request-k04-ball-and-cube-in-the-basket.uritp`](kitchen/request-k04-ball-and-cube-in-the-basket.uritp) |
| K5 | "put the ball, the cube and the cup on the shelf" | only one thing moved | [`request-k05-three-things-on-the-shelf.uritp`](kitchen/request-k05-three-things-on-the-shelf.uritp) |
| K6 | "put the ball in the basket and the cube in the basket and the cup in the basket" | landed on the same spot | [`request-k06-three-things-in-the-basket.uritp`](kitchen/request-k06-three-things-in-the-basket.uritp) |
| K7 | "put everything in the basket"<br>"tidy up the table" | group words not understood | [`request-k07-tidy-everything.uritp`](kitchen/request-k07-tidy-everything.uritp) |
| K8 | "put the cup on the shelf and the ball next to it" | words dropped | [`request-k08-ball-next-to-the-cup.uritp`](kitchen/request-k08-ball-next-to-the-cup.uritp) |
| K9 | "swap the ball and the cube" | words dropped | [`request-k09-swap-ball-and-cube.uritp`](kitchen/request-k09-swap-ball-and-cube.uritp) |
| K10 | "put the ball in the basket and then bring it back to where it was" | picked "it" up from the wrong place | [`request-k10-bring-it-back.uritp`](kitchen/request-k10-bring-it-back.uritp) |
| K11 | "put the ball on the plate, wait 3 seconds, then put it in the basket" | picked "it" up from the wrong place | [`request-k11-plate-wait-then-basket.uritp`](kitchen/request-k11-plate-wait-then-basket.uritp) |
| K12 | "put the cube 10 cm to the left of the ball" | words dropped | [`request-k12-cube-left-of-the-ball.uritp`](kitchen/request-k12-cube-left-of-the-ball.uritp) |
| K13 | "put the ball in the basket and say how far it was" | said the words, not the answer | [`request-k13-say-how-far.uritp`](kitchen/request-k13-say-how-far.uritp) |
| K14 | "put only the things that are close to the basket in the basket" | group words not understood | [`request-k14-only-what-is-close.uritp`](kitchen/request-k14-only-what-is-close.uritp) |
| T1 | "deliver to the shop and the post office but not the school" | "not" ignored | [`request-t01-not-the-school.uritp`](town/request-t01-not-the-school.uritp) |
| T2 | "don't go to the school, go to the park"<br>"school mat jao, park jao" | "not" ignored | [`request-t02-do-not-go-to-the-school.uritp`](town/request-t02-do-not-go-to-the-school.uritp) |
| T3 | "do the delivery round but skip the post office" | "not" ignored | [`request-t03-skip-the-post-office.uritp`](town/request-t03-skip-the-post-office.uritp) |
| T4 | "go to the park without crossing the flowers"<br>"go to the park, but if the flowers are in the way go around them" | zone to avoid became a target | [`request-t04-around-the-flowers.uritp`](town/request-t04-around-the-flowers.uritp) |
| T5 | "go to the shop, wait there for 5 seconds, then come home" | words dropped | [`request-t05-wait-at-the-shop.uritp`](town/request-t05-wait-at-the-shop.uritp) |
| T6 | "go to every place in town" | group words not understood | [`request-t06-every-place.uritp`](town/request-t06-every-place.uritp) |
| T7 | "drive in a square" | words dropped | [`request-t07-drive-a-square.uritp`](town/request-t07-drive-a-square.uritp) |
| T8 | "go to the nearest place" | words dropped | [`request-t08-nearest-place.uritp`](town/request-t08-nearest-place.uritp) |
| T9 | "go to the shop and say how far it is from home" | said the words, not the answer | [`request-t09-say-how-far.uritp`](town/request-t09-say-how-far.uritp) |
| T10 | "deliver to the school first and then to the shop" | "first" ignored | [`request-t10-school-first.uritp`](town/request-t10-school-first.uritp) |
| W1 | "go to aisle b and then to packing" | only say understood here | [`request-w01-aisle-b-then-packing.uritp`](warehouse/request-w01-aisle-b-then-packing.uritp) |
| W2 | "pick up from aisle c, and if it is blocked use aisle b" | only say understood here | [`request-w02-blocked-aisle.uritp`](warehouse/request-w02-blocked-aisle.uritp) |
| W3 | "wait until you are loaded, then go to packing" | only say understood here | [`request-w03-wait-to-be-loaded.uritp`](warehouse/request-w03-wait-to-be-loaded.uritp) |
| W4 | "go to the loading bay but keep out of the forklift lane" | only say understood here | [`request-w04-avoid-the-forklift-lane.uritp`](warehouse/request-w04-avoid-the-forklift-lane.uritp) |
| F1 | "take off, take a photo of plant p1 and land" | only say understood here | [`request-f01-photo-of-p1.uritp`](farm/request-f01-photo-of-p1.uritp) |
| F2 | "spray every plant in row 1" | only say understood here | [`request-f02-spray-row-one.uritp`](farm/request-f02-spray-row-one.uritp) |
| F3 | "fly to the barn and come back to the pad" | only say understood here | [`request-f03-barn-and-back.uritp`](farm/request-f03-barn-and-back.uritp) |
| X1 | "weld the seam" | only say understood here | [`request-x01-weld-the-seam.uritp`](factory/request-x01-weld-the-seam.uritp) |
| X2 | "put the plate in the jig and weld the frame" | only say understood here | [`request-x02-jig-then-weld.uritp`](factory/request-x02-jig-then-weld.uritp) |
| X3 | "move the finished plate to the bin" | only say understood here | [`request-x03-plate-to-the-bin.uritp`](factory/request-x03-plate-to-the-bin.uritp) |

## Patterns, and what the translator needs

### Two or more things put in one place land on the same spot

A place is one point to Elara, so everything put there is dropped on that point and the last thing hides the others.

**What Elara needs:** When more than one thing goes to the same holder, give each its own spot inside it (the shelf is 28cm across, the basket 24cm, the plate 22cm), and understand "side by side", "next to" and "not on top".

Cases: K1, K2, K3, K6

### Only one thing in a list is moved

Elara splits a sentence at "and" and commas, so "the ball and the cube in the basket" becomes "the ball" (no place, skipped) and "the cube in the basket".

**What Elara needs:** Keep a list of things together with the place that follows it, and move each one.

Cases: K4, K5

### Words for groups or rules are not understood

"everything", "tidy up", "every place" and "only the things that are close" are not in Elara's word lists.

**What Elara needs:** Turn group words into a for loop over the world's things or places, and comparisons into if with distance().

Cases: K7, K14, T6

### "not", "don't", "skip" and "mat" are ignored

Elara picks out place names wherever they are, so "don't go to the school" sends the robot to the school.

**What Elara needs:** Treat a place after a negative word as excluded: leave it out, or skip it inside a loop.

Cases: T1, T2, T3

### A zone to keep away from becomes a place to go to

"without crossing the flowers" contains the word "flowers", which Elara turns into a move into the flower bed; the checker then refuses the whole program.

**What Elara needs:** After "without", "around", "avoid" or "keep out of", a zone becomes avoid zones.NAME on the move.

Cases: T4

### "it" means where the thing started, not where it is now

Elara remembers which thing "it" is, but always picks it up from its starting place, even after it has been moved.

**What Elara needs:** Remember where each thing was last put down, and pick it up from there.

Cases: K10, K11

### Other everyday words are dropped

"wait", "swap", "next to", "to the left of", "square" and "nearest" are unknown, and are skipped or silently ignored.

**What Elara needs:** Add them: wait becomes wait Ns, and the others become a few lines of moves (see the fixes).

Cases: K8, K9, K12, T5, T7, T8

### "say how far" says the words, not the distance

Everything after "say" is spoken as it is, so the robot says "How far it was!".

**What Elara needs:** When "say" is followed by a question (how far, how many), work the answer out with distance() and put it in the text.

Cases: K13, T9

### "first" is ignored

"deliver" always runs the whole route in its own order, whatever order the person gives.

**What Elara needs:** When places are named, visit them in the order said, and only those.

Cases: T10

### The warehouse, farm and factory understand only "say"

Elara's built-in translator has words only for the kitchen and the town; in the other three worlds every request except say is skipped, so nothing moves.

**What Elara needs:** Add the words of these worlds (aisles, packing, take off, land, photo, spray, weld, jig, bin) and their statements.

Cases: W1, W2, W3, W4, F1, F2, F3, X1, X2, X3

## The cases

### K1. Kitchen (robot arm): landed on the same spot

> "keep red ball on the shelf and then keep blue cube also on the shelf keep them side by side not on top of the other"

**What it asks:** The ball and the cube both on the shelf, side by side, so both can be seen.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.red_ball.above(10cm)
grip arm.gripper close
move arm.tool to places.shelf.above(10cm)
grip arm.gripper open
move arm.tool to places.blue_cube.above(10cm)
grip arm.gripper close
move arm.tool to places.shelf.above(10cm)
grip arm.gripper open
```

**What happened:**

- ball: on the shelf at (-0.50, 0.00)
- cube: on the shelf at (-0.50, 0.00)
- cup: on the table at (0.05, 0.60)
- ball and cube on the shelf: 0cm apart (one hides the other)

**Why:** Elara only knows the shelf as one point, its centre, so both things are dropped on exactly the same spot and the cube hides the ball. The words "side by side" and "not on top of the other" are not understood, and nothing is reported as skipped.

**Corrected program** ([`request-k01-side-by-side-on-the-shelf.uritp`](kitchen/request-k01-side-by-side-on-the-shelf.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

# Two spots on the shelf, 14cm apart: the ball on the left, the cube on the right.
define place shelf_left  = pose(-0.5m, 0.07m, 0.12m)
define place shelf_right = pose(-0.5m, -0.07m, 0.12m)

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.red_ball, places.shelf_left)
carry(places.blue_cube, places.shelf_right)
say "The ball and the cube are on the shelf, side by side."
```

**What happens now:**

- ball: on the shelf at (-0.50, 0.07)
- cube: on the shelf at (-0.50, -0.07)
- cup: on the table at (0.05, 0.60)
- ball and cube on the shelf: 14cm apart
- said: "The ball and the cube are on the shelf, side by side."

### K2. Kitchen (robot arm): landed on the same spot

> "laal gend ko shelf pe rakho aur neela dabba bhi shelf pe rakho, ek ke upar ek nahi"

**What it asks:** (Hinglish) Put the red ball on the shelf and the blue box on the shelf too, not one on top of the other.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.red_ball.above(10cm)
grip arm.gripper close
move arm.tool to places.shelf.above(10cm)
grip arm.gripper open
move arm.tool to places.blue_cube.above(10cm)
grip arm.gripper close
move arm.tool to places.shelf.above(10cm)
grip arm.gripper open
```

Elara reported as skipped: "ek ke upar ek nahi"

**What happened:**

- ball: on the shelf at (-0.50, 0.00)
- cube: on the shelf at (-0.50, 0.00)
- cup: on the table at (0.05, 0.60)
- ball and cube on the shelf: 0cm apart (one hides the other)

**Why:** The same mistake in Hinglish: both go to the centre of the shelf. Here Elara even reports "ek ke upar ek nahi" (not one on top of the other) as skipped, then does exactly that.

**Corrected program** ([`request-k02-side-by-side-hinglish.uritp`](kitchen/request-k02-side-by-side-hinglish.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

# Do jagah shelf par, 14cm ki doori par: gend baayen, dabba daayen.
define place shelf_left  = pose(-0.5m, 0.07m, 0.12m)
define place shelf_right = pose(-0.5m, -0.07m, 0.12m)

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.red_ball, places.shelf_left)
carry(places.blue_cube, places.shelf_right)
say "गेंद और डिब्बा शेल्फ़ पर, एक-दूसरे के बगल में।" lang hi
```

**What happens now:**

- ball: on the shelf at (-0.50, 0.07)
- cube: on the shelf at (-0.50, -0.07)
- cup: on the table at (0.05, 0.60)
- ball and cube on the shelf: 14cm apart
- said: "गेंद और डिब्बा शेल्फ़ पर, एक-दूसरे के बगल में।"

### K3. Kitchen (robot arm): landed on the same spot

> "put the cube on the plate, then put the ball on the plate too"

**What it asks:** The cube and the ball both on the plate, both visible.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.blue_cube.above(10cm)
grip arm.gripper close
move arm.tool to places.plate.above(10cm)
grip arm.gripper open
move arm.tool to places.red_ball.above(10cm)
grip arm.gripper close
move arm.tool to places.plate.above(10cm)
grip arm.gripper open
```

**What happened:**

- ball: on the plate at (0.60, -0.45)
- cube: on the plate at (0.60, -0.45)
- cup: on the table at (0.05, 0.60)
- ball and cube on the plate: 0cm apart (one hides the other)

**Why:** Both are dropped on the centre of the plate, so the ball lands where the cube already is.

**Corrected program** ([`request-k03-both-on-the-plate.uritp`](kitchen/request-k03-both-on-the-plate.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

# The plate is 22cm across: one spot for each thing, 10cm apart.
define place plate_near = pose(0.6m, -0.40m, 0.01m)
define place plate_far  = pose(0.6m, -0.50m, 0.01m)

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.blue_cube, places.plate_near)
carry(places.red_ball, places.plate_far)
```

**What happens now:**

- ball: on the plate at (0.60, -0.50)
- cube: on the plate at (0.60, -0.40)
- cup: on the table at (0.05, 0.60)
- ball and cube on the plate: 10cm apart

### K4. Kitchen (robot arm): only one thing moved

> "put the ball and the cube in the basket"

**What it asks:** Both the ball and the cube in the basket.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.blue_cube.above(10cm)
grip arm.gripper close
move arm.tool to places.basket.above(10cm)
grip arm.gripper open
```

Elara reported as skipped: "put the ball"

**What happened:**

- ball: on the table at (0.55, 0.25)
- cube: in the basket at (0.25, -0.50)
- cup: on the table at (0.05, 0.60)

**Why:** Elara splits the sentence at "and". "put the ball" has no place, so it is skipped; only "the cube in the basket" is done. The ball stays on the table.

**Corrected program** ([`request-k04-ball-and-cube-in-the-basket.uritp`](kitchen/request-k04-ball-and-cube-in-the-basket.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

# Two spots in the basket, so the ball and the cube do not land on each other.
define place basket_left  = pose(0.25m, -0.45m, 0.06m)
define place basket_right = pose(0.25m, -0.55m, 0.06m)

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.red_ball, places.basket_left)
carry(places.blue_cube, places.basket_right)
```

**What happens now:**

- ball: in the basket at (0.25, -0.45)
- cube: in the basket at (0.25, -0.55)
- cup: on the table at (0.05, 0.60)
- ball and cube in the basket: 10cm apart

### K5. Kitchen (robot arm): only one thing moved

> "put the ball, the cube and the cup on the shelf"

**What it asks:** All three things on the shelf, in a row.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.cup.above(10cm)
grip arm.gripper close
move arm.tool to places.shelf.above(10cm)
grip arm.gripper open
```

Elara reported as skipped: "put the ball", "the cube"

**What happened:**

- ball: on the table at (0.55, 0.25)
- cube: on the table at (0.60, -0.15)
- cup: on the shelf at (-0.50, 0.00)

**Why:** Only the last thing before the place (the cup) is moved. "put the ball" and "the cube" are skipped.

**Corrected program** ([`request-k05-three-things-on-the-shelf.uritp`](kitchen/request-k05-three-things-on-the-shelf.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

# Three spots in a row along the shelf, 9cm apart.
define place shelf_left   = pose(-0.5m, 0.09m, 0.12m)
define place shelf_middle = pose(-0.5m, 0m, 0.12m)
define place shelf_right  = pose(-0.5m, -0.09m, 0.12m)

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.red_ball, places.shelf_left)
carry(places.blue_cube, places.shelf_middle)
carry(places.cup, places.shelf_right)
```

**What happens now:**

- ball: on the shelf at (-0.50, 0.09)
- cube: on the shelf at (-0.50, 0.00)
- cup: on the shelf at (-0.50, -0.09)
- ball and cube on the shelf: 9cm apart
- ball and cup on the shelf: 18cm apart
- cube and cup on the shelf: 9cm apart

### K6. Kitchen (robot arm): landed on the same spot

> "put the ball in the basket and the cube in the basket and the cup in the basket"

**What it asks:** All three things in the basket, each one visible.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.red_ball.above(10cm)
grip arm.gripper close
move arm.tool to places.basket.above(10cm)
grip arm.gripper open
move arm.tool to places.blue_cube.above(10cm)
grip arm.gripper close
move arm.tool to places.basket.above(10cm)
grip arm.gripper open
move arm.tool to places.cup.above(10cm)
grip arm.gripper close
move arm.tool to places.basket.above(10cm)
grip arm.gripper open
```

**What happened:**

- ball: in the basket at (0.25, -0.50)
- cube: in the basket at (0.25, -0.50)
- cup: in the basket at (0.25, -0.50)
- ball and cube in the basket: 0cm apart (one hides the other)
- ball and cup in the basket: 0cm apart (one hides the other)
- cube and cup in the basket: 0cm apart (one hides the other)

**Why:** All three are dropped on the centre of the basket, one on top of the other.

**Corrected program** ([`request-k06-three-things-in-the-basket.uritp`](kitchen/request-k06-three-things-in-the-basket.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

# Three spots around the middle of the basket, about 10cm apart.
define place basket_a = pose(0.31m, -0.50m, 0.06m)
define place basket_b = pose(0.22m, -0.448m, 0.06m)
define place basket_c = pose(0.22m, -0.552m, 0.06m)

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.red_ball, places.basket_a)
carry(places.blue_cube, places.basket_b)
carry(places.cup, places.basket_c)
```

**What happens now:**

- ball: in the basket at (0.31, -0.50)
- cube: in the basket at (0.22, -0.45)
- cup: in the basket at (0.22, -0.55)
- ball and cube in the basket: 10cm apart
- ball and cup in the basket: 10cm apart
- cube and cup in the basket: 10cm apart

### K7. Kitchen (robot arm): group words not understood

> "put everything in the basket"

> "tidy up the table"

**What it asks:** Every thing on the table (the ball, the cube and the cup) in the basket.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.basket.above(10cm)
grip arm.gripper open
```

**What happened:**

- ball: on the table at (0.55, 0.25)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)

For "tidy up the table", Elara wrote:

```
import "kitchen.uritp"
robot arm = connect("play:arm")
```

- ball: on the table at (0.55, 0.25)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)
- no robot moved

**Why:** Elara knows no word for "everything" or "tidy up". For the first, it moves the empty hand over the basket and opens it; for the second, it does nothing.

**Corrected program** ([`request-k07-tidy-everything.uritp`](kitchen/request-k07-tidy-everything.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

# Three spots around the middle of the basket, about 10cm apart.
define place basket_a = pose(0.31m, -0.50m, 0.06m)
define place basket_b = pose(0.22m, -0.448m, 0.06m)
define place basket_c = pose(0.22m, -0.552m, 0.06m)

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.red_ball, places.basket_a)
carry(places.blue_cube, places.basket_b)
carry(places.cup, places.basket_c)
say "The table is tidy."
```

**What happens now:**

- ball: in the basket at (0.31, -0.50)
- cube: in the basket at (0.22, -0.45)
- cup: in the basket at (0.22, -0.55)
- ball and cube in the basket: 10cm apart
- ball and cup in the basket: 10cm apart
- cube and cup in the basket: 10cm apart
- said: "The table is tidy."

### K8. Kitchen (robot arm): words dropped

> "put the cup on the shelf and the ball next to it"

**What it asks:** The cup on the shelf, and the ball on the shelf next to the cup.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.cup.above(10cm)
grip arm.gripper close
move arm.tool to places.shelf.above(10cm)
grip arm.gripper open
```

Elara reported as skipped: "the ball next to it"

**What happened:**

- ball: on the table at (0.55, 0.25)
- cube: on the table at (0.60, -0.15)
- cup: on the shelf at (-0.50, 0.00)

**Why:** "the ball next to it" has no place Elara knows, so it is skipped and the ball stays on the table.

**Corrected program** ([`request-k08-ball-next-to-the-cup.uritp`](kitchen/request-k08-ball-next-to-the-cup.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

# Two spots side by side on the shelf, 12cm apart.
define place shelf_left  = pose(-0.5m, 0.06m, 0.12m)
define place shelf_right = pose(-0.5m, -0.06m, 0.12m)

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.cup, places.shelf_left)
carry(places.red_ball, places.shelf_right)
```

**What happens now:**

- ball: on the shelf at (-0.50, -0.06)
- cube: on the table at (0.60, -0.15)
- cup: on the shelf at (-0.50, 0.06)
- ball and cup on the shelf: 12cm apart

### K9. Kitchen (robot arm): words dropped

> "swap the ball and the cube"

**What it asks:** The ball where the cube was, and the cube where the ball was.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")
```

Elara reported as skipped: "swap the ball", "the cube"

**What happened:**

- ball: on the table at (0.55, 0.25)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)
- no robot moved

**Why:** Elara does not know "swap", so nothing happens. Swapping needs a free spot to put one thing down first.

**Corrected program** ([`request-k09-swap-ball-and-cube.uritp`](kitchen/request-k09-swap-ball-and-cube.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

# The plate is free, so the ball waits there while the cube moves.
carry(places.red_ball, places.plate)
carry(places.blue_cube, places.red_ball)
carry(places.plate, places.blue_cube)
say "Swapped."
```

**What happens now:**

- ball: on the table at (0.60, -0.15)
- cube: on the table at (0.55, 0.25)
- cup: on the table at (0.05, 0.60)
- said: "Swapped."

### K10. Kitchen (robot arm): picked "it" up from the wrong place

> "put the ball in the basket and then bring it back to where it was"

**What it asks:** The ball goes into the basket, then back to the spot it started from.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.red_ball.above(10cm)
grip arm.gripper close
move arm.tool to places.basket.above(10cm)
grip arm.gripper open
move arm.tool to places.red_ball.above(10cm)
grip arm.gripper close
```

**What happened:**

- ball: in the basket at (0.25, -0.50)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)

**Why:** Elara reads "bring it" as "pick up the ball from where balls start". It goes back to the ball's old spot, which is now empty, and grips nothing. The ball stays in the basket.

**Corrected program** ([`request-k10-bring-it-back.uritp`](kitchen/request-k10-bring-it-back.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.red_ball, places.basket)
# Pick it up from where it is now (the basket) and put it back where it started.
carry(places.basket, places.red_ball)
```

**What happens now:**

- ball: on the table at (0.55, 0.25)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)

### K11. Kitchen (robot arm): picked "it" up from the wrong place

> "put the ball on the plate, wait 3 seconds, then put it in the basket"

**What it asks:** The ball on the plate, a 3 second pause, then the ball from the plate into the basket.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.red_ball.above(10cm)
grip arm.gripper close
move arm.tool to places.plate.above(10cm)
grip arm.gripper open
move arm.tool to places.red_ball.above(10cm)
grip arm.gripper close
move arm.tool to places.basket.above(10cm)
grip arm.gripper open
```

Elara reported as skipped: "wait 3 seconds"

**What happened:**

- ball: on the plate at (0.60, -0.45)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)

**Why:** Two mistakes. "wait 3 seconds" is skipped. Then "put it in the basket" goes to the ball's old spot instead of the plate, so the ball is left on the plate.

**Corrected program** ([`request-k11-plate-wait-then-basket.uritp`](kitchen/request-k11-plate-wait-then-basket.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.red_ball, places.plate)
wait 3s
carry(places.plate, places.basket)
```

**What happens now:**

- ball: in the basket at (0.25, -0.50)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)
- waited: 3s

### K12. Kitchen (robot arm): words dropped

> "put the cube 10 cm to the left of the ball"

**What it asks:** The cube on the table, 10cm to the left of the ball (as the arm sees it).

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")
```

Elara reported as skipped: "put the cube 10 cm to the left of the ball"

**What happened:**

- ball: on the table at (0.55, 0.25)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)
- no robot moved

**Why:** Elara does not know "to the left of", so nothing happens.

**Corrected program** ([`request-k12-cube-left-of-the-ball.uritp`](kitchen/request-k12-cube-left-of-the-ball.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

# The ball is at (0.55m, 0.25m). Seen from the arm, left is +y, so 10cm to its left is y = 0.35m.
define place left_of_ball = pose(0.55m, 0.35m, 0.04m)

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

carry(places.blue_cube, places.left_of_ball)
```

**What happens now:**

- ball: on the table at (0.55, 0.25)
- cube: on the table at (0.55, 0.35)
- cup: on the table at (0.05, 0.60)

### K13. Kitchen (robot arm): said the words, not the answer

> "put the ball in the basket and say how far it was"

**What it asks:** The ball in the basket, and the robot says how far the ball was from the basket.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.red_ball.above(10cm)
grip arm.gripper close
move arm.tool to places.basket.above(10cm)
grip arm.gripper open
say "How far it was!"
```

**What happened:**

- ball: in the basket at (0.25, -0.50)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)
- said: "How far it was!"

**Why:** Elara turns "say how far it was" into the robot literally saying "How far it was!".

**Corrected program** ([`request-k13-say-how-far.uritp`](kitchen/request-k13-say-how-far.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open

let far = distance(places.red_ball, places.basket)
carry(places.red_ball, places.basket)
say "The ball was {far} from the basket."
```

**What happens now:**

- ball: in the basket at (0.25, -0.50)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)
- said: "The ball was 0.808m from the basket."

### K14. Kitchen (robot arm): group words not understood

> "put only the things that are close to the basket in the basket"

**What it asks:** Only the things less than 1m from the basket (the ball and the cube) in the basket; the cup, 1.12m away, stays.

**Elara's program:**

```
import "kitchen.uritp"
robot arm = connect("play:arm")

move arm.tool to places.basket.above(10cm)
grip arm.gripper open
```

**What happened:**

- ball: on the table at (0.55, 0.25)
- cube: on the table at (0.60, -0.15)
- cup: on the table at (0.05, 0.60)

**Why:** Elara cannot compare distances, and does not know "things". It moves the empty hand over the basket and opens it.

**Corrected program** ([`request-k14-only-what-is-close.uritp`](kitchen/request-k14-only-what-is-close.uritp)):

```
import "kitchen.uritp"
robot arm = connect("play:arm")

define place basket_left  = pose(0.25m, -0.45m, 0.06m)
define place basket_right = pose(0.25m, -0.55m, 0.06m)
define place basket_back  = pose(0.31m, -0.50m, 0.06m)

# Carries a thing to its own spot in the basket only if it is less than 1m away.
task tidy_if_close(thing, spot):
    if distance(thing, places.basket) < 1m:
        move arm.tool to thing.above(10cm)
        grip arm.gripper close
        move arm.tool to spot.above(10cm)
        grip arm.gripper open
    else:
        say "{thing.name} stays"

tidy_if_close(places.red_ball, places.basket_left)
tidy_if_close(places.blue_cube, places.basket_right)
tidy_if_close(places.cup, places.basket_back)
```

**What happens now:**

- ball: in the basket at (0.25, -0.45)
- cube: in the basket at (0.25, -0.55)
- cup: on the table at (0.05, 0.60)
- ball and cube in the basket: 10cm apart
- said: "cup stays"

### T1. Town (rover): "not" ignored

> "deliver to the shop and the post office but not the school"

**What it asks:** Deliveries to the shop and the post office only; the rover never goes to the school.

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")

for stop in route.delivery:
    move rover.base to stop
    say "Delivery!"
move rover.base to places.post_office
move rover.base to places.school
```

**What happened:**

- went to: shop → post office → school → post office → school
- said: "Delivery!", "Delivery!", "Delivery!"

**Why:** "deliver" makes Elara run the whole delivery route, which includes the school. Then it goes to the post office and the school again: "but not the school" became "go to the school".

**Corrected program** ([`request-t01-not-the-school.uritp`](town/request-t01-not-the-school.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

for spot in [places.shop, places.post_office]:
    move rover.base to spot
    say "Delivery for the {spot.name}!"
move rover.base to places.home
```

**What happens now:**

- went to: shop → post office → home
- said: "Delivery for the shop!", "Delivery for the post_office!"

### T2. Town (rover): "not" ignored

> "don't go to the school, go to the park"

> "school mat jao, park jao"

**What it asks:** Go to the park, and not to the school. ("school mat jao" is Hindi for "don't go to the school".)

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")

move rover.base to places.school
move rover.base to places.park
```

**What happened:**

- went to: school → park

For "school mat jao, park jao", Elara wrote:

```
import "town.uritp"
robot rover = connect("play:rover")

move rover.base to places.school
move rover.base to places.park
```

- went to: school → park

**Why:** Elara ignores "don't" and "mat", so the rover goes to the school first, the one place it was told not to go.

**Corrected program** ([`request-t02-do-not-go-to-the-school.uritp`](town/request-t02-do-not-go-to-the-school.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

move rover.base to places.park
say "At the park. I did not go to the school."
```

**What happens now:**

- went to: park
- said: "At the park. I did not go to the school."

### T3. Town (rover): "not" ignored

> "do the delivery round but skip the post office"

**What it asks:** The delivery round, leaving out the post office.

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")

for stop in route.delivery:
    move rover.base to stop
    say "Delivery!"
```

**What happened:**

- went to: shop → post office → school
- said: "Delivery!", "Delivery!", "Delivery!"

**Why:** Elara runs the whole round and ignores "skip the post office" without reporting it as skipped.

**Corrected program** ([`request-t03-skip-the-post-office.uritp`](town/request-t03-skip-the-post-office.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

for spot in route.delivery:
    if spot.name != "post_office":
        move rover.base to spot
        say "Delivery!"
move rover.base to places.home
```

**What happens now:**

- went to: shop → school → home
- said: "Delivery!", "Delivery!"

### T4. Town (rover): zone to avoid became a target

> "go to the park without crossing the flowers"

> "go to the park, but if the flowers are in the way go around them"

**What it asks:** Go to the park, keeping off the flower bed on the way.

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")

move rover.base to places.park
move rover.base to pose(1.3m, 3.4m, 0m)
```

**What happened:**

- The checker refused the program, so the robot did not move: E503 (line 5): the target is inside zones.flowers, which is forbidden for 'Playground delivery rover (simulated)'.

For "go to the park, but if the flowers are in the way go around them", Elara wrote:

```
import "town.uritp"
robot rover = connect("play:rover")

move rover.base to places.park
move rover.base to pose(1.3m, 3.4m, 0m)
```

- The checker refused the program, so the robot did not move: E503 (line 5): the target is inside zones.flowers, which is forbidden for 'Playground delivery rover (simulated)'.

**Why:** Mentioning the flowers makes Elara add a move into the middle of the flower bed. The flower bed is forbidden for the rover, so the checker refuses the whole program (E503) and the rover does not move at all.

**Corrected program** ([`request-t04-around-the-flowers.uritp`](town/request-t04-around-the-flowers.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

move rover.base to places.park
    avoid zones.flowers
say "At the park, and the flowers are fine."
```

**What happens now:**

- went to: park
- said: "At the park, and the flowers are fine."

### T5. Town (rover): words dropped

> "go to the shop, wait there for 5 seconds, then come home"

**What it asks:** Go to the shop, wait 5 seconds there, then come home.

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")

move rover.base to places.shop
move rover.base to places.home
```

Elara reported as skipped: "wait there for 5 seconds"

**What happened:**

- went to: shop → home

**Why:** "wait there for 5 seconds" is skipped, so the rover turns round at the shop straight away.

**Corrected program** ([`request-t05-wait-at-the-shop.uritp`](town/request-t05-wait-at-the-shop.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

move rover.base to places.shop
wait 5s
move rover.base to places.home
```

**What happens now:**

- went to: shop → home
- waited: 5s

### T6. Town (rover): group words not understood

> "go to every place in town"

**What it asks:** Visit the shop, the school, the post office and the park.

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")
```

Elara reported as skipped: "go to every place in town"

**What happened:**

- the robot did not go anywhere
- no robot moved

**Why:** Elara does not know "every place", so nothing happens.

**Corrected program** ([`request-t06-every-place.uritp`](town/request-t06-every-place.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

for spot in [places.shop, places.school, places.post_office, places.park]:
    move rover.base to spot
    say "Hello, {spot.name}!"
move rover.base to places.home
```

**What happens now:**

- went to: shop → school → post office → park → home
- said: "Hello, shop!", "Hello, school!", "Hello, post_office!", "Hello, park!"

### T7. Town (rover): words dropped

> "drive in a square"

**What it asks:** Drive the four sides of a square.

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")
```

Elara reported as skipped: "drive in a square"

**What happened:**

- the robot did not go anywhere
- no robot moved

**Why:** Elara does not know "square", so nothing happens.

**Corrected program** ([`request-t07-drive-a-square.uritp`](town/request-t07-drive-a-square.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

repeat 4 times:
    drive rover.base forward by 1m
    turn rover.base by 90deg
```

**What happens now:**

- the robot did not go anywhere

### T8. Town (rover): words dropped

> "go to the nearest place"

**What it asks:** Go to whichever place is closest to home (the park, 4.8m away).

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")
```

Elara reported as skipped: "go to the nearest place"

**What happened:**

- the robot did not go anywhere
- no robot moved

**Why:** Elara cannot compare distances, so nothing happens.

**Corrected program** ([`request-t08-nearest-place.uritp`](town/request-t08-nearest-place.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

let to_shop = distance(places.home, places.shop)
let to_school = distance(places.home, places.school)
let to_post = distance(places.home, places.post_office)
let to_park = distance(places.home, places.park)

if to_park <= to_shop and to_park <= to_school and to_park <= to_post:
    move rover.base to places.park
elif to_post <= to_shop and to_post <= to_school:
    move rover.base to places.post_office
elif to_shop <= to_school:
    move rover.base to places.shop
else:
    move rover.base to places.school
say "This is the nearest place to home."
```

**What happens now:**

- went to: park
- said: "This is the nearest place to home."

### T9. Town (rover): said the words, not the answer

> "go to the shop and say how far it is from home"

**What it asks:** Go to the shop and say the distance from home to the shop.

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")

move rover.base to places.shop
say "How far it is from home!"
```

**What happened:**

- went to: shop
- said: "How far it is from home!"

**Why:** Elara makes the robot say the words "How far it is from home!" instead of the distance.

**Corrected program** ([`request-t09-say-how-far.uritp`](town/request-t09-say-how-far.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

let far = distance(places.home, places.shop)
move rover.base to places.shop
say "The shop is {far} from home."
```

**What happens now:**

- went to: shop
- said: "The shop is 7.603m from home."

### T10. Town (rover): "first" ignored

> "deliver to the school first and then to the shop"

**What it asks:** The school first, then the shop.

**Elara's program:**

```
import "town.uritp"
robot rover = connect("play:rover")

for stop in route.delivery:
    move rover.base to stop
    say "Delivery!"
move rover.base to places.shop
```

**What happened:**

- went to: shop → post office → school → shop
- said: "Delivery!", "Delivery!", "Delivery!"

**Why:** "deliver" runs the whole delivery route (shop, post office, school), so the shop comes first, and "first" is ignored.

**Corrected program** ([`request-t10-school-first.uritp`](town/request-t10-school-first.uritp)):

```
import "town.uritp"
robot rover = connect("play:rover")

for spot in [places.school, places.shop]:
    move rover.base to spot
    say "Delivery for the {spot.name}!"
```

**What happens now:**

- went to: school → shop
- said: "Delivery for the school!", "Delivery for the shop!"

### W1. Warehouse (cart): only say understood here

> "go to aisle b and then to packing"

**What it asks:** Go to aisle B, then to the packing table.

**Elara's program:**

```
import "warehouse.uritp"
robot cart = connect("play:cart")
```

Elara reported as skipped: "go to aisle b", "to packing"

**What happened:**

- the robot did not go anywhere
- no robot moved

**Why:** In the warehouse, Elara only understands "say". Everything else is skipped, so the cart does not move.

**Corrected program** ([`request-w01-aisle-b-then-packing.uritp`](warehouse/request-w01-aisle-b-then-packing.uritp)):

```
import "warehouse.uritp"
robot cart = connect("play:cart")

move cart.base to places.aisle_b
move cart.base to places.packing
```

**What happens now:**

- went to: aisle B → packing

### W2. Warehouse (cart): only say understood here

> "pick up from aisle c, and if it is blocked use aisle b"

**What it asks:** Try aisle C; if it is blocked (it is, today), go to aisle B instead.

**Elara's program:**

```
import "warehouse.uritp"
robot cart = connect("play:cart")
```

Elara reported as skipped: "pick up from aisle c", "if it is blocked use aisle b"

**What happened:**

- the robot did not go anywhere
- no robot moved

**Why:** Nothing is understood, so the cart does not move. Coping with a blocked aisle needs on fail:.

**Corrected program** ([`request-w02-blocked-aisle.uritp`](warehouse/request-w02-blocked-aisle.uritp)):

```
import "warehouse.uritp"
robot cart = connect("play:cart")

task fetch():
    move cart.base to places.aisle_c
    on fail:
        say "Aisle C is blocked. Using aisle B."
        move cart.base to places.aisle_b

fetch()
```

**What happens now:**

- went to: aisle C → aisle B
- failure handled: R703: move failed: path blocked at places.aisle_c -> running 'on fail'
- said: "Aisle C is blocked. Using aisle B."

### W3. Warehouse (cart): only say understood here

> "wait until you are loaded, then go to packing"

**What it asks:** Wait for the tray to be loaded, then take the load to packing.

**Elara's program:**

```
import "warehouse.uritp"
robot cart = connect("play:cart")
```

Elara reported as skipped: "wait until you are loaded", "go to packing"

**What happened:**

- the robot did not go anywhere
- no robot moved

**Why:** Nothing is understood, so the cart does not move.

**Corrected program** ([`request-w03-wait-to-be-loaded.uritp`](warehouse/request-w03-wait-to-be-loaded.uritp)):

```
import "warehouse.uritp"
robot cart = connect("play:cart")

wait until cart.tray.loaded timeout 10s
move cart.base to places.packing
```

**What happens now:**

- went to: packing
- waited: 2s

### W4. Warehouse (cart): only say understood here

> "go to the loading bay but keep out of the forklift lane"

**What it asks:** Go to the loading bay, never entering the forklift lane.

**Elara's program:**

```
import "warehouse.uritp"
robot cart = connect("play:cart")
```

Elara reported as skipped: "go to the loading bay but keep out of the forklift lane"

**What happened:**

- the robot did not go anywhere
- no robot moved

**Why:** Nothing is understood, so the cart does not move.

**Corrected program** ([`request-w04-avoid-the-forklift-lane.uritp`](warehouse/request-w04-avoid-the-forklift-lane.uritp)):

```
import "warehouse.uritp"
robot cart = connect("play:cart")

move cart.base to places.loading
    avoid zones.forklift
```

**What happens now:**

- went to: loading

### F1. Farm (drone): only say understood here

> "take off, take a photo of plant p1 and land"

**What it asks:** Take off, photograph plant p1 from above, and land.

**Elara's program:**

```
import "farm.uritp"
robot drone = connect("play:drone")
```

Elara reported as skipped: "take off", "take a photo of plant p1", "land"

**What happened:**

- never took off
- no robot moved

**Why:** On the farm, Elara only understands "say", so the drone never takes off.

**Corrected program** ([`request-f01-photo-of-p1.uritp`](farm/request-f01-photo-of-p1.uritp)):

```
import "farm.uritp"
robot drone = connect("play:drone")

takeoff drone to 3m
move drone.base to places.p1.at_height(2m)
capture drone.camera save as "p1.jpg"
land drone at places.pad
```

**What happens now:**

- took off
- photos: p1.jpg
- landed at: pad

### F2. Farm (drone): only say understood here

> "spray every plant in row 1"

**What it asks:** Spray plants p1, p2 and p3.

**Elara's program:**

```
import "farm.uritp"
robot drone = connect("play:drone")
```

Elara reported as skipped: "spray every plant in row 1"

**What happened:**

- never took off
- no robot moved

**Why:** Nothing is understood, so the drone never takes off.

**Corrected program** ([`request-f02-spray-row-one.uritp`](farm/request-f02-spray-row-one.uritp)):

```
import "farm.uritp"
robot drone = connect("play:drone")

takeoff drone to 3m
for plant in route.row_1:
    move drone.base to plant.at_height(2m)
    spray drone.sprayer on plant amount 20ml
land drone at places.pad
```

**What happens now:**

- took off
- sprayed: p1, p2, p3
- landed at: pad

### F3. Farm (drone): only say understood here

> "fly to the barn and come back to the pad"

**What it asks:** Fly over the barn, then land back on the pad.

**Elara's program:**

```
import "farm.uritp"
robot drone = connect("play:drone")
```

Elara reported as skipped: "fly to the barn", "come back to the pad"

**What happened:**

- never took off
- no robot moved

**Why:** Nothing is understood, so the drone never takes off.

**Corrected program** ([`request-f03-barn-and-back.uritp`](farm/request-f03-barn-and-back.uritp)):

```
import "farm.uritp"
robot drone = connect("play:drone")

takeoff drone to 4m
move drone.base to places.barn.at_height(4m)
land drone at places.pad
```

**What happens now:**

- took off
- landed at: pad

### X1. Factory (welder and picker): only say understood here

> "weld the seam"

**What it asks:** Weld along the seam.

**Elara's program:**

```
import "factory.uritp"
robot welder = connect("play:welder")
robot picker = connect("play:picker")
```

Elara reported as skipped: "weld the seam"

**What happened:**

- plate: on the table at (1.20, 0.45)
- no robot moved

**Why:** In the factory, Elara only understands "say", so neither arm moves.

**Corrected program** ([`request-x01-weld-the-seam.uritp`](factory/request-x01-weld-the-seam.uritp)):

```
import "factory.uritp"
robot welder = connect("play:welder")
robot picker = connect("play:picker")

weld along route.seam speed 5mm/s current 120A
```

**What happens now:**

- plate: on the table at (1.20, 0.45)
- welded: route.seam

### X2. Factory (welder and picker): only say understood here

> "put the plate in the jig and weld the frame"

**What it asks:** The picker puts the plate in the jig, then the welder welds the frame.

**Elara's program:**

```
import "factory.uritp"
robot welder = connect("play:welder")
robot picker = connect("play:picker")
```

Elara reported as skipped: "put the plate in the jig", "weld the frame"

**What happened:**

- plate: on the table at (1.20, 0.45)
- no robot moved

**Why:** Nothing is understood, so neither arm moves.

**Corrected program** ([`request-x02-jig-then-weld.uritp`](factory/request-x02-jig-then-weld.uritp)):

```
import "factory.uritp"
robot welder = connect("play:welder")
robot picker = connect("play:picker")

move picker.tool to places.plate.above(10cm)
grip picker.gripper close
move picker.tool to places.jig.above(10cm)
grip picker.gripper open
move picker.tool to places.bin.above(20cm)
weld along route.frame speed 5mm/s current 120A
```

**What happens now:**

- plate: in the jig at (0.05, 0.00)
- welded: route.frame

### X3. Factory (welder and picker): only say understood here

> "move the finished plate to the bin"

**What it asks:** The picker takes the plate and puts it in the bin.

**Elara's program:**

```
import "factory.uritp"
robot welder = connect("play:welder")
robot picker = connect("play:picker")
```

Elara reported as skipped: "move the finished plate to the bin"

**What happened:**

- plate: on the table at (1.20, 0.45)
- no robot moved

**Why:** Nothing is understood, so neither arm moves.

**Corrected program** ([`request-x03-plate-to-the-bin.uritp`](factory/request-x03-plate-to-the-bin.uritp)):

```
import "factory.uritp"
robot welder = connect("play:welder")
robot picker = connect("play:picker")

move picker.tool to places.plate.above(10cm)
grip picker.gripper close
move picker.tool to places.bin.above(10cm)
grip picker.gripper open
```

**What happens now:**

- plate: in the bin at (1.25, -0.45)

## Requests Elara gets right

Checked the same way: each of these does what was asked.

| World | Request |
|---|---|
| kitchen | "put the red ball in the basket and the blue cube on the plate" |
| kitchen | "put the ball on the shelf, the cube on the plate and the cup in the basket" |
| kitchen | "put the ball on the plate but not the cube" |
| kitchen | "put the cup in the basket, not the ball" |
| kitchen | "move the ball to the basket without going near the stove" |
| town | "go to the shop at full speed" |
| town | "go to the school and come back home" |
| town | "visit the shop then the park then home" |
| town | "go to the school and stay away from the pond" |
| town | "go forward 2 meters, turn left, go forward 1 meter" |

## How these were checked

1. Each request went through the playground's own translator (`playground/js/translate.js`), as typed into the page.
2. Each program, Elara's and the corrected one, was checked and run by the playground's engine (`playground/py/bridge.py`), then played on its headless scene (`playground/js/scene.js`), the same way the page judges exercises.
3. A check written for each request says whether the scene matches what was asked: for example, the ball and the cube both on the shelf and at least 8cm apart.
4. Every corrected program also passes this URITP's checker (`tests/sandboxes.test.ts`).

Only the built-in translator was tested. With the optional AI helper switched on, the playground first asks Gemini when the built-in translator misses part of a sentence, so results there can differ.
