// The translator cases: each request, what it asks for in plain words, a check of that on the
// playground's scene, a corrected URITP program, and the pattern behind Elara's mistake.

const K = 'import "kitchen.uritp"\nrobot arm = connect("play:arm")\n';
const T = 'import "town.uritp"\nrobot rover = connect("play:rover")\n';
const W = 'import "warehouse.uritp"\nrobot cart = connect("play:cart")\n';
const F = 'import "farm.uritp"\nrobot drone = connect("play:drone")\n';
const X = 'import "factory.uritp"\nrobot welder = connect("play:welder")\nrobot picker = connect("play:picker")\n';

const CARRY = `task carry(thing, spot):
    move arm.tool to thing.above(10cm)
    grip arm.gripper close
    move arm.tool to spot.above(10cm)
    grip arm.gripper open
`;

// ---- helpers the checks use ----------------------------------------------------------------
const START = { red_ball: [0.55, 0.25], blue_cube: [0.6, -0.15], cup: [0.05, 0.6] };
const o = (c, id) => c.state.objects[id];
const gap = (c, a, b) => Math.hypot(o(c, a).x - o(c, b).x, o(c, a).y - o(c, b).y);
const near = (c, id, xy, tol = 0.03) => Math.hypot(o(c, id).x - xy[0], o(c, id).y - xy[1]) <= tol;
const inn = (c, id, holder) => o(c, id).in === holder;
const apart = (c, ids, min = 0.08) => ids.every((a, i) => ids.slice(i + 1).every((b) => gap(c, a, b) >= min));
const visited = (c) => c.log.visited;
const went = (c, ...places) => { let i = 0; for (const v of visited(c)) if (v === places[i]) i++; return i === places.length; };
const said = (c, text) => c.says.some((s) => s.toLowerCase().includes(text.toLowerCase()));
const waited = (c, s) => c.waits.some((w) => w >= s - 1e-6);
const moved = (c, what) => c.instrs.some((i) => i.op === "MOVE" && String(i.target).includes(what));
const ops = (c, op) => c.instrs.filter((i) => i.op === op).length;
const skill = (c, name) => c.instrs.some((i) => i.op === "SKILL" && i.name === name);

// ---- the cases where Elara's program does not do what was asked ------------------------------
export const CASES = [
  {
    id: "K1", world: "kitchen", pattern: "same-spot",
    prompts: ["keep red ball on the shelf and then keep blue cube also on the shelf keep them side by side not on top of the other"],
    asked: "The ball and the cube both on the shelf, side by side, so both can be seen.",
    check: (c) => inn(c, "red_ball", "shelf") && inn(c, "blue_cube", "shelf") && apart(c, ["red_ball", "blue_cube"]),
    why: "Elara only knows the shelf as one point, its centre, so both things are dropped on exactly the same spot and the cube hides the ball. The words \"side by side\" and \"not on top of the other\" are not understood, and nothing is reported as skipped.",
    fix: `${K}
# Two spots on the shelf, 14cm apart: the ball on the left, the cube on the right.
define place shelf_left  = pose(-0.5m, 0.07m, 0.12m)
define place shelf_right = pose(-0.5m, -0.07m, 0.12m)

${CARRY}
carry(places.red_ball, places.shelf_left)
carry(places.blue_cube, places.shelf_right)
say "The ball and the cube are on the shelf, side by side."
`,
  },
  {
    id: "K2", world: "kitchen", pattern: "same-spot",
    prompts: ["laal gend ko shelf pe rakho aur neela dabba bhi shelf pe rakho, ek ke upar ek nahi"],
    asked: "(Hinglish) Put the red ball on the shelf and the blue box on the shelf too, not one on top of the other.",
    check: (c) => inn(c, "red_ball", "shelf") && inn(c, "blue_cube", "shelf") && apart(c, ["red_ball", "blue_cube"]),
    why: "The same mistake in Hinglish: both go to the centre of the shelf. Here Elara even reports \"ek ke upar ek nahi\" (not one on top of the other) as skipped, then does exactly that.",
    fix: `${K}
# Do jagah shelf par, 14cm ki doori par: gend baayen, dabba daayen.
define place shelf_left  = pose(-0.5m, 0.07m, 0.12m)
define place shelf_right = pose(-0.5m, -0.07m, 0.12m)

${CARRY}
carry(places.red_ball, places.shelf_left)
carry(places.blue_cube, places.shelf_right)
say "गेंद और डिब्बा शेल्फ़ पर, एक-दूसरे के बगल में।" lang hi
`,
  },
  {
    id: "K3", world: "kitchen", pattern: "same-spot",
    prompts: ["put the cube on the plate, then put the ball on the plate too"],
    asked: "The cube and the ball both on the plate, both visible.",
    check: (c) => inn(c, "red_ball", "plate") && inn(c, "blue_cube", "plate") && apart(c, ["red_ball", "blue_cube"]),
    why: "Both are dropped on the centre of the plate, so the ball lands where the cube already is.",
    fix: `${K}
# The plate is 22cm across: one spot for each thing, 10cm apart.
define place plate_near = pose(0.6m, -0.40m, 0.01m)
define place plate_far  = pose(0.6m, -0.50m, 0.01m)

${CARRY}
carry(places.blue_cube, places.plate_near)
carry(places.red_ball, places.plate_far)
`,
  },
  {
    id: "K4", world: "kitchen", pattern: "first-only",
    prompts: ["put the ball and the cube in the basket"],
    asked: "Both the ball and the cube in the basket.",
    check: (c) => inn(c, "red_ball", "basket") && inn(c, "blue_cube", "basket") && apart(c, ["red_ball", "blue_cube"]),
    why: "Elara splits the sentence at \"and\". \"put the ball\" has no place, so it is skipped; only \"the cube in the basket\" is done. The ball stays on the table.",
    fix: `${K}
# Two spots in the basket, so the ball and the cube do not land on each other.
define place basket_left  = pose(0.25m, -0.45m, 0.06m)
define place basket_right = pose(0.25m, -0.55m, 0.06m)

${CARRY}
carry(places.red_ball, places.basket_left)
carry(places.blue_cube, places.basket_right)
`,
  },
  {
    id: "K5", world: "kitchen", pattern: "first-only",
    prompts: ["put the ball, the cube and the cup on the shelf"],
    asked: "All three things on the shelf, in a row.",
    check: (c) => ["red_ball", "blue_cube", "cup"].every((t) => inn(c, t, "shelf")) && apart(c, ["red_ball", "blue_cube", "cup"]),
    why: "Only the last thing before the place (the cup) is moved. \"put the ball\" and \"the cube\" are skipped.",
    fix: `${K}
# Three spots in a row along the shelf, 9cm apart.
define place shelf_left   = pose(-0.5m, 0.09m, 0.12m)
define place shelf_middle = pose(-0.5m, 0m, 0.12m)
define place shelf_right  = pose(-0.5m, -0.09m, 0.12m)

${CARRY}
carry(places.red_ball, places.shelf_left)
carry(places.blue_cube, places.shelf_middle)
carry(places.cup, places.shelf_right)
`,
  },
  {
    id: "K6", world: "kitchen", pattern: "same-spot",
    prompts: ["put the ball in the basket and the cube in the basket and the cup in the basket"],
    asked: "All three things in the basket, each one visible.",
    check: (c) => ["red_ball", "blue_cube", "cup"].every((t) => inn(c, t, "basket")) && apart(c, ["red_ball", "blue_cube", "cup"]),
    why: "All three are dropped on the centre of the basket, one on top of the other.",
    fix: `${K}
# Three spots around the middle of the basket, about 10cm apart.
define place basket_a = pose(0.31m, -0.50m, 0.06m)
define place basket_b = pose(0.22m, -0.448m, 0.06m)
define place basket_c = pose(0.22m, -0.552m, 0.06m)

${CARRY}
carry(places.red_ball, places.basket_a)
carry(places.blue_cube, places.basket_b)
carry(places.cup, places.basket_c)
`,
  },
  {
    id: "K7", world: "kitchen", pattern: "groups",
    prompts: ["put everything in the basket", "tidy up the table"],
    asked: "Every thing on the table (the ball, the cube and the cup) in the basket.",
    check: (c) => ["red_ball", "blue_cube", "cup"].every((t) => inn(c, t, "basket")) && apart(c, ["red_ball", "blue_cube", "cup"]),
    why: "Elara knows no word for \"everything\" or \"tidy up\". For the first, it moves the empty hand over the basket and opens it; for the second, it does nothing.",
    fix: `${K}
# Three spots around the middle of the basket, about 10cm apart.
define place basket_a = pose(0.31m, -0.50m, 0.06m)
define place basket_b = pose(0.22m, -0.448m, 0.06m)
define place basket_c = pose(0.22m, -0.552m, 0.06m)

${CARRY}
carry(places.red_ball, places.basket_a)
carry(places.blue_cube, places.basket_b)
carry(places.cup, places.basket_c)
say "The table is tidy."
`,
  },
  {
    id: "K8", world: "kitchen", pattern: "unknown-words",
    prompts: ["put the cup on the shelf and the ball next to it"],
    asked: "The cup on the shelf, and the ball on the shelf next to the cup.",
    check: (c) => inn(c, "cup", "shelf") && inn(c, "red_ball", "shelf") && apart(c, ["cup", "red_ball"]) && gap(c, "cup", "red_ball") <= 0.2,
    why: "\"the ball next to it\" has no place Elara knows, so it is skipped and the ball stays on the table.",
    fix: `${K}
# Two spots side by side on the shelf, 12cm apart.
define place shelf_left  = pose(-0.5m, 0.06m, 0.12m)
define place shelf_right = pose(-0.5m, -0.06m, 0.12m)

${CARRY}
carry(places.cup, places.shelf_left)
carry(places.red_ball, places.shelf_right)
`,
  },
  {
    id: "K9", world: "kitchen", pattern: "unknown-words",
    prompts: ["swap the ball and the cube"],
    asked: "The ball where the cube was, and the cube where the ball was.",
    check: (c) => near(c, "red_ball", START.blue_cube) && near(c, "blue_cube", START.red_ball),
    why: "Elara does not know \"swap\", so nothing happens. Swapping needs a free spot to put one thing down first.",
    fix: `${K}
${CARRY}
# The plate is free, so the ball waits there while the cube moves.
carry(places.red_ball, places.plate)
carry(places.blue_cube, places.red_ball)
carry(places.plate, places.blue_cube)
say "Swapped."
`,
  },
  {
    id: "K10", world: "kitchen", pattern: "it-and-back",
    prompts: ["put the ball in the basket and then bring it back to where it was"],
    asked: "The ball goes into the basket, then back to the spot it started from.",
    check: (c) => moved(c, "basket") && near(c, "red_ball", START.red_ball) && o(c, "red_ball").in === null,
    why: "Elara reads \"bring it\" as \"pick up the ball from where balls start\". It goes back to the ball's old spot, which is now empty, and grips nothing. The ball stays in the basket.",
    fix: `${K}
${CARRY}
carry(places.red_ball, places.basket)
# Pick it up from where it is now (the basket) and put it back where it started.
carry(places.basket, places.red_ball)
`,
  },
  {
    id: "K11", world: "kitchen", pattern: "it-and-back",
    prompts: ["put the ball on the plate, wait 3 seconds, then put it in the basket"],
    asked: "The ball on the plate, a 3 second pause, then the ball from the plate into the basket.",
    check: (c) => moved(c, "plate") && waited(c, 3) && inn(c, "red_ball", "basket"),
    why: "Two mistakes. \"wait 3 seconds\" is skipped. Then \"put it in the basket\" goes to the ball's old spot instead of the plate, so the ball is left on the plate.",
    fix: `${K}
${CARRY}
carry(places.red_ball, places.plate)
wait 3s
carry(places.plate, places.basket)
`,
  },
  {
    id: "K12", world: "kitchen", pattern: "unknown-words",
    prompts: ["put the cube 10 cm to the left of the ball"],
    asked: "The cube on the table, 10cm to the left of the ball (as the arm sees it).",
    check: (c) => near(c, "blue_cube", [0.55, 0.35], 0.02) && near(c, "red_ball", START.red_ball),
    why: "Elara does not know \"to the left of\", so nothing happens.",
    fix: `${K}
# The ball is at (0.55m, 0.25m). Seen from the arm, left is +y, so 10cm to its left is y = 0.35m.
define place left_of_ball = pose(0.55m, 0.35m, 0.04m)

${CARRY}
carry(places.blue_cube, places.left_of_ball)
`,
  },
  {
    id: "K13", world: "kitchen", pattern: "say-value",
    prompts: ["put the ball in the basket and say how far it was"],
    asked: "The ball in the basket, and the robot says how far the ball was from the basket.",
    check: (c) => inn(c, "red_ball", "basket") && said(c, "0.808"),
    why: "Elara turns \"say how far it was\" into the robot literally saying \"How far it was!\".",
    fix: `${K}
${CARRY}
let far = distance(places.red_ball, places.basket)
carry(places.red_ball, places.basket)
say "The ball was {far} from the basket."
`,
  },
  {
    id: "K14", world: "kitchen", pattern: "groups",
    prompts: ["put only the things that are close to the basket in the basket"],
    asked: "Only the things less than 1m from the basket (the ball and the cube) in the basket; the cup, 1.12m away, stays.",
    check: (c) => inn(c, "red_ball", "basket") && inn(c, "blue_cube", "basket") && !inn(c, "cup", "basket") && apart(c, ["red_ball", "blue_cube"]) && said(c, "cup stays"),
    why: "Elara cannot compare distances, and does not know \"things\". It moves the empty hand over the basket and opens it.",
    fix: `${K}
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
`,
  },
  // ---------------------------------------------------------------------------------- town
  {
    id: "T1", world: "town", pattern: "negation",
    prompts: ["deliver to the shop and the post office but not the school"],
    asked: "Deliveries to the shop and the post office only; the rover never goes to the school.",
    check: (c) => went(c, "shop", "post_office") && !visited(c).includes("school"),
    why: "\"deliver\" makes Elara run the whole delivery route, which includes the school. Then it goes to the post office and the school again: \"but not the school\" became \"go to the school\".",
    fix: `${T}
for spot in [places.shop, places.post_office]:
    move rover.base to spot
    say "Delivery for the {spot.name}!"
move rover.base to places.home
`,
  },
  {
    id: "T2", world: "town", pattern: "negation",
    prompts: ["don't go to the school, go to the park", "school mat jao, park jao"],
    asked: "Go to the park, and not to the school. (\"school mat jao\" is Hindi for \"don't go to the school\".)",
    check: (c) => visited(c).includes("park") && !visited(c).includes("school"),
    why: "Elara ignores \"don't\" and \"mat\", so the rover goes to the school first, the one place it was told not to go.",
    fix: `${T}
move rover.base to places.park
say "At the park. I did not go to the school."
`,
  },
  {
    id: "T3", world: "town", pattern: "negation",
    prompts: ["do the delivery round but skip the post office"],
    asked: "The delivery round, leaving out the post office.",
    check: (c) => went(c, "shop", "school") && !visited(c).includes("post_office"),
    why: "Elara runs the whole round and ignores \"skip the post office\" without reporting it as skipped.",
    fix: `${T}
for spot in route.delivery:
    if spot.name != "post_office":
        move rover.base to spot
        say "Delivery!"
move rover.base to places.home
`,
  },
  {
    id: "T4", world: "town", pattern: "avoid-into",
    prompts: ["go to the park without crossing the flowers", "go to the park, but if the flowers are in the way go around them"],
    asked: "Go to the park, keeping off the flower bed on the way.",
    check: (c) => c.ok && visited(c).includes("park"),
    why: "Mentioning the flowers makes Elara add a move into the middle of the flower bed. The flower bed is forbidden for the rover, so the checker refuses the whole program (E503) and the rover does not move at all.",
    fix: `${T}
move rover.base to places.park
    avoid zones.flowers
say "At the park, and the flowers are fine."
`,
  },
  {
    id: "T5", world: "town", pattern: "unknown-words",
    prompts: ["go to the shop, wait there for 5 seconds, then come home"],
    asked: "Go to the shop, wait 5 seconds there, then come home.",
    check: (c) => went(c, "shop", "home") && waited(c, 5),
    why: "\"wait there for 5 seconds\" is skipped, so the rover turns round at the shop straight away.",
    fix: `${T}
move rover.base to places.shop
wait 5s
move rover.base to places.home
`,
  },
  {
    id: "T6", world: "town", pattern: "groups",
    prompts: ["go to every place in town"],
    asked: "Visit the shop, the school, the post office and the park.",
    check: (c) => ["shop", "school", "post_office", "park"].every((p) => visited(c).includes(p)),
    why: "Elara does not know \"every place\", so nothing happens.",
    fix: `${T}
for spot in [places.shop, places.school, places.post_office, places.park]:
    move rover.base to spot
    say "Hello, {spot.name}!"
move rover.base to places.home
`,
  },
  {
    id: "T7", world: "town", pattern: "unknown-words",
    prompts: ["drive in a square"],
    asked: "Drive the four sides of a square.",
    check: (c) => ops(c, "DRIVE") >= 4 && ops(c, "TURN") >= 4,
    why: "Elara does not know \"square\", so nothing happens.",
    fix: `${T}
repeat 4 times:
    drive rover.base forward by 1m
    turn rover.base by 90deg
`,
  },
  {
    id: "T8", world: "town", pattern: "unknown-words",
    prompts: ["go to the nearest place"],
    asked: "Go to whichever place is closest to home (the park, 4.8m away).",
    check: (c) => visited(c)[0] === "park",
    why: "Elara cannot compare distances, so nothing happens.",
    fix: `${T}
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
`,
  },
  {
    id: "T9", world: "town", pattern: "say-value",
    prompts: ["go to the shop and say how far it is from home"],
    asked: "Go to the shop and say the distance from home to the shop.",
    check: (c) => visited(c).includes("shop") && said(c, "7.6"),
    why: "Elara makes the robot say the words \"How far it is from home!\" instead of the distance.",
    fix: `${T}
let far = distance(places.home, places.shop)
move rover.base to places.shop
say "The shop is {far} from home."
`,
  },
  {
    id: "T10", world: "town", pattern: "order",
    prompts: ["deliver to the school first and then to the shop"],
    asked: "The school first, then the shop.",
    check: (c) => visited(c)[0] === "school" && went(c, "school", "shop"),
    why: "\"deliver\" runs the whole delivery route (shop, post office, school), so the shop comes first, and \"first\" is ignored.",
    fix: `${T}
for spot in [places.school, places.shop]:
    move rover.base to spot
    say "Delivery for the {spot.name}!"
`,
  },
  // ----------------------------------------------------------------------------- warehouse
  {
    id: "W1", world: "warehouse", pattern: "world-not-supported",
    prompts: ["go to aisle b and then to packing"],
    asked: "Go to aisle B, then to the packing table.",
    check: (c) => went(c, "aisle_b", "packing"),
    why: "In the warehouse, Elara only understands \"say\". Everything else is skipped, so the cart does not move.",
    fix: `${W}
move cart.base to places.aisle_b
move cart.base to places.packing
`,
  },
  {
    id: "W2", world: "warehouse", pattern: "world-not-supported",
    prompts: ["pick up from aisle c, and if it is blocked use aisle b"],
    asked: "Try aisle C; if it is blocked (it is, today), go to aisle B instead.",
    check: (c) => c.log.fails.some((f) => f.includes("R703")) && visited(c).includes("aisle_b"),
    why: "Nothing is understood, so the cart does not move. Coping with a blocked aisle needs on fail:.",
    fix: `${W}
task fetch():
    move cart.base to places.aisle_c
    on fail:
        say "Aisle C is blocked. Using aisle B."
        move cart.base to places.aisle_b

fetch()
`,
  },
  {
    id: "W3", world: "warehouse", pattern: "world-not-supported",
    prompts: ["wait until you are loaded, then go to packing"],
    asked: "Wait for the tray to be loaded, then take the load to packing.",
    check: (c) => visited(c).includes("packing") && c.source.includes("wait until"),
    why: "Nothing is understood, so the cart does not move.",
    fix: `${W}
wait until cart.tray.loaded timeout 10s
move cart.base to places.packing
`,
  },
  {
    id: "W4", world: "warehouse", pattern: "world-not-supported",
    prompts: ["go to the loading bay but keep out of the forklift lane"],
    asked: "Go to the loading bay, never entering the forklift lane.",
    check: (c) => visited(c).includes("loading") && c.instrs.some((i) => i.op === "MOVE" && (i.avoid || []).includes("zones.forklift")),
    why: "Nothing is understood, so the cart does not move.",
    fix: `${W}
move cart.base to places.loading
    avoid zones.forklift
`,
  },
  // ---------------------------------------------------------------------------------- farm
  {
    id: "F1", world: "farm", pattern: "world-not-supported",
    prompts: ["take off, take a photo of plant p1 and land"],
    asked: "Take off, photograph plant p1 from above, and land.",
    check: (c) => c.log.photos.some((p) => p.place === "p1") && c.log.landed.length > 0,
    why: "On the farm, Elara only understands \"say\", so the drone never takes off.",
    fix: `${F}
takeoff drone to 3m
move drone.base to places.p1.at_height(2m)
capture drone.camera save as "p1.jpg"
land drone at places.pad
`,
  },
  {
    id: "F2", world: "farm", pattern: "world-not-supported",
    prompts: ["spray every plant in row 1"],
    asked: "Spray plants p1, p2 and p3.",
    check: (c) => ["p1", "p2", "p3"].every((p) => c.log.sprayed.some((s) => s.place === p)),
    why: "Nothing is understood, so the drone never takes off.",
    fix: `${F}
takeoff drone to 3m
for plant in route.row_1:
    move drone.base to plant.at_height(2m)
    spray drone.sprayer on plant amount 20ml
land drone at places.pad
`,
  },
  {
    id: "F3", world: "farm", pattern: "world-not-supported",
    prompts: ["fly to the barn and come back to the pad"],
    asked: "Fly over the barn, then land back on the pad.",
    check: (c) => moved(c, "barn") && c.log.landed.includes("pad"),
    why: "Nothing is understood, so the drone never takes off.",
    fix: `${F}
takeoff drone to 4m
move drone.base to places.barn.at_height(4m)
land drone at places.pad
`,
  },
  // ------------------------------------------------------------------------------- factory
  {
    id: "X1", world: "factory", pattern: "world-not-supported",
    prompts: ["weld the seam"],
    asked: "Weld along the seam.",
    check: (c) => c.log.welded.includes("seam"),
    why: "In the factory, Elara only understands \"say\", so neither arm moves.",
    fix: `${X}
weld along route.seam speed 5mm/s current 120A
`,
  },
  {
    id: "X2", world: "factory", pattern: "world-not-supported",
    prompts: ["put the plate in the jig and weld the frame"],
    asked: "The picker puts the plate in the jig, then the welder welds the frame.",
    check: (c) => inn(c, "plate", "jig") && c.log.welded.includes("frame"),
    why: "Nothing is understood, so neither arm moves.",
    fix: `${X}
move picker.tool to places.plate.above(10cm)
grip picker.gripper close
move picker.tool to places.jig.above(10cm)
grip picker.gripper open
move picker.tool to places.bin.above(20cm)
weld along route.frame speed 5mm/s current 120A
`,
  },
  {
    id: "X3", world: "factory", pattern: "world-not-supported",
    prompts: ["move the finished plate to the bin"],
    asked: "The picker takes the plate and puts it in the bin.",
    check: (c) => inn(c, "plate", "bin"),
    why: "Nothing is understood, so neither arm moves.",
    fix: `${X}
move picker.tool to places.plate.above(10cm)
grip picker.gripper close
move picker.tool to places.bin.above(10cm)
grip picker.gripper open
`,
  },
];

// ---- requests Elara gets right (checked the same way) ----------------------------------------
export const GOOD = [
  { world: "kitchen", prompt: "put the red ball in the basket and the blue cube on the plate",
    check: (c) => inn(c, "red_ball", "basket") && inn(c, "blue_cube", "plate") },
  { world: "kitchen", prompt: "put the ball on the shelf, the cube on the plate and the cup in the basket",
    check: (c) => inn(c, "red_ball", "shelf") && inn(c, "blue_cube", "plate") && inn(c, "cup", "basket") },
  { world: "kitchen", prompt: "put the ball on the plate but not the cube",
    check: (c) => inn(c, "red_ball", "plate") && near(c, "blue_cube", START.blue_cube) },
  { world: "kitchen", prompt: "put the cup in the basket, not the ball",
    check: (c) => inn(c, "cup", "basket") && near(c, "red_ball", START.red_ball) },
  { world: "kitchen", prompt: "move the ball to the basket without going near the stove",
    check: (c) => inn(c, "red_ball", "basket") },
  { world: "town", prompt: "go to the shop at full speed",
    check: (c) => visited(c).includes("shop") && c.log.speeds.some((s) => s >= 1 - 1e-9) },
  { world: "town", prompt: "go to the school and come back home", check: (c) => went(c, "school", "home") },
  { world: "town", prompt: "visit the shop then the park then home", check: (c) => went(c, "shop", "park", "home") },
  { world: "town", prompt: "go to the school and stay away from the pond", check: (c) => visited(c).includes("school") },
  { world: "town", prompt: "go forward 2 meters, turn left, go forward 1 meter",
    check: (c) => ops(c, "DRIVE") === 2 && ops(c, "TURN") === 1 },
];

export const PATTERNS = {
  "same-spot": ["Two or more things put in one place land on the same spot",
    "A place is one point to Elara, so everything put there is dropped on that point and the last thing hides the others.",
    "When more than one thing goes to the same holder, give each its own spot inside it (the shelf is 28cm across, the basket 24cm, the plate 22cm), and understand \"side by side\", \"next to\" and \"not on top\"."],
  "first-only": ["Only one thing in a list is moved",
    "Elara splits a sentence at \"and\" and commas, so \"the ball and the cube in the basket\" becomes \"the ball\" (no place, skipped) and \"the cube in the basket\".",
    "Keep a list of things together with the place that follows it, and move each one."],
  "groups": ["Words for groups or rules are not understood",
    "\"everything\", \"tidy up\", \"every place\" and \"only the things that are close\" are not in Elara's word lists.",
    "Turn group words into a for loop over the world's things or places, and comparisons into if with distance()."],
  "negation": ["\"not\", \"don't\", \"skip\" and \"mat\" are ignored",
    "Elara picks out place names wherever they are, so \"don't go to the school\" sends the robot to the school.",
    "Treat a place after a negative word as excluded: leave it out, or skip it inside a loop."],
  "avoid-into": ["A zone to keep away from becomes a place to go to",
    "\"without crossing the flowers\" contains the word \"flowers\", which Elara turns into a move into the flower bed; the checker then refuses the whole program.",
    "After \"without\", \"around\", \"avoid\" or \"keep out of\", a zone becomes avoid zones.NAME on the move."],
  "it-and-back": ["\"it\" means where the thing started, not where it is now",
    "Elara remembers which thing \"it\" is, but always picks it up from its starting place, even after it has been moved.",
    "Remember where each thing was last put down, and pick it up from there."],
  "unknown-words": ["Other everyday words are dropped",
    "\"wait\", \"swap\", \"next to\", \"to the left of\", \"square\" and \"nearest\" are unknown, and are skipped or silently ignored.",
    "Add them: wait becomes wait Ns, and the others become a few lines of moves (see the fixes)."],
  "say-value": ["\"say how far\" says the words, not the distance",
    "Everything after \"say\" is spoken as it is, so the robot says \"How far it was!\".",
    "When \"say\" is followed by a question (how far, how many), work the answer out with distance() and put it in the text."],
  "order": ["\"first\" is ignored",
    "\"deliver\" always runs the whole route in its own order, whatever order the person gives.",
    "When places are named, visit them in the order said, and only those."],
  "world-not-supported": ["The warehouse, farm and factory understand only \"say\"",
    "Elara's built-in translator has words only for the kitchen and the town; in the other three worlds every request except say is skipped, so nothing moves.",
    "Add the words of these worlds (aisles, packing, take off, land, photo, spray, weld, jig, bin) and their statements."],
};
