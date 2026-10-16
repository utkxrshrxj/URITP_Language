// Plays every run on the playground's headless scene and judges it against what was asked.
// Writes report.json: what happened in each run, and whether it did what the request asked.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const clone = process.argv[2];
const { Scene } = await import(pathToFileURL(`${clone}/playground/js/scene.js`).href);
const { flatten } = await import(pathToFileURL(`${clone}/playground/js/checks.js`).href);
const { CASES, GOOD } = await import("./cases.mjs");
const layouts = JSON.parse(readFileSync(`${clone}/playground/data.json`, "utf8")).layouts;
const runs = JSON.parse(readFileSync("runs-out.json", "utf8"));
const judge = new Scene(null);

const NAMES = { red_ball: "ball", blue_cube: "cube", cup: "cup", plate: "plate", post_office: "post office", aisle_a: "aisle A", aisle_b: "aisle B", aisle_c: "aisle C" };
const nm = (id) => NAMES[id] || id;
const xy = (o) => `(${o.x.toFixed(2)}, ${o.y.toFixed(2)})`;

function context(r) {
  if (!r.ok) return { ok: false, refused: r.errors.map((e) => `${e.code} (line ${e.line}): ${e.message}`), state: { objects: {} }, log: { visited: [], fails: [], photos: [], landed: [], sprayed: [], welded: [], speeds: [] }, says: [], waits: [], instrs: [], source: r.source };
  judge.setWorld(r.world, layouts[r.world]);
  const result = judge.simulate(r.events);
  const all = flatten(r.events);
  const instrs = all.filter((e) => e.type === "instr").map((e) => e.instr);
  const waits = all.filter((e) => e.type === "wait").map((e) => parseFloat((/(\d+(?:\.\d+)?)/.exec(e.text) || [0, 0])[1]));
  return { ok: true, status: result.status, state: judge.state, log: judge.log, instrs, waits, source: r.source,
    says: instrs.filter((i) => i.op === "SAY").map((i) => String(i.text)), logs: all.filter((e) => e.type === "log").map((e) => e.text) };
}

// What happened, in plain words, from what the scene saw.
function happened(c, world) {
  if (!c.ok) return [`The checker refused the program, so the robot did not move: ${c.refused.join("; ")}.`];
  const out = [];
  const objs = c.state.objects || {};
  if (world === "kitchen" || world === "factory") {
    const ids = Object.keys(objs);
    for (const id of ids) {
      const o = objs[id];
      out.push(`${nm(id)}: ${o.in ? `in the ${nm(o.in)}` : "on the table"} at ${xy(o)}`);
    }
    const byHolder = {};
    for (const id of ids) if (objs[id].in) (byHolder[objs[id].in] ||= []).push(id);
    for (const [h, list] of Object.entries(byHolder)) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const d = Math.hypot(objs[list[i]].x - objs[list[j]].x, objs[list[i]].y - objs[list[j]].y) * 100;
        out.push(`${nm(list[i])} and ${nm(list[j])} in the ${nm(h)}: ${d.toFixed(0)}cm apart${d < 8 ? " (one hides the other)" : ""}`);
      }
    }
    if (c.log.welded.length) out.push(`welded: ${c.log.welded.map((w) => "route." + w).join(", ")}`);
  }
  if (world === "town" || world === "warehouse") out.push(c.log.visited.length ? `went to: ${c.log.visited.map(nm).join(" → ")}` : "the robot did not go anywhere");
  if (world === "farm") {
    out.push(c.instrs.some((i) => i.op === "SKILL" && i.name === "takeoff") ? "took off" : "never took off");
    if (c.log.photos.length) out.push(`photos: ${c.log.photos.map((p) => p.file).join(", ")}`);
    if (c.log.sprayed.length) out.push(`sprayed: ${c.log.sprayed.map((s) => s.place).join(", ")}`);
    if (c.log.landed.length) out.push(`landed at: ${c.log.landed.join(", ")}`);
  }
  if (c.waits.length) out.push(`waited: ${c.waits.map((w) => w + "s").join(", ")}`);
  if (c.log.fails && c.log.fails.length) out.push(`failure handled: ${c.log.fails.join("; ")}`);
  if (c.says.length) out.push(`said: ${c.says.map((s) => `"${s}"`).join(", ")}`);
  if (!c.instrs.some((i) => i.op !== "SAY")) out.push("no robot moved");
  return out;
}

const report = { cases: [], good: [] };
const byId = Object.fromEntries(runs.map((r) => [r.id, r]));
let problems = 0;
for (const cs of CASES) {
  const entry = { id: cs.id, world: cs.world, pattern: cs.pattern, asked: cs.asked, why: cs.why, fix: cs.fix, elara: [] };
  cs.prompts.forEach((prompt, i) => {
    const r = byId[`${cs.id}:elara:${i}`];
    const c = context(r);
    const met = c.ok && cs.check(c);
    if (met) { problems++; console.log(`!! ${cs.id} Elara's program already meets the goal for: ${prompt}`); }
    entry.elara.push({ prompt, source: r.source, skipped: r.skipped, met, happened: happened(c, cs.world) });
  });
  const fr = byId[`${cs.id}:fix`];
  const fc = context(fr);
  entry.fixMet = fc.ok && fc.status === "finished" && cs.check(fc);
  entry.fixHappened = happened(fc, cs.world);
  if (!entry.fixMet) { problems++; console.log(`!! ${cs.id} fix fails: status=${fc.status} ${fc.refused || ""}`, entry.fixHappened); }
  report.cases.push(entry);
}
GOOD.forEach((g, i) => {
  const r = byId[`G${i}:elara:0`];
  const c = context(r);
  const met = c.ok && c.status === "finished" && g.check(c);
  if (!met) { problems++; console.log(`!! good case not met: ${g.prompt}`, happened(c, g.world)); }
  report.good.push({ world: g.world, prompt: g.prompt, source: r.source, met, happened: happened(c, g.world) });
});
writeFileSync("report.json", JSON.stringify(report, null, 1));
console.log(`${report.cases.length} cases, ${report.good.length} good; problems: ${problems}`);
