// Translates every request with the playground's translator and lists the programs to run:
// Elara's program for each request, each corrected program, and the requests Elara gets right.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const clone = process.argv[2];
const { translate } = await import(pathToFileURL(`${clone}/playground/js/translate.js`).href);
const { CASES, GOOD } = await import("./cases.mjs");
const runs = [];
for (const c of CASES) {
  c.prompts.forEach((prompt, i) => {
    const t = translate(prompt, c.world, {});
    runs.push({ id: `${c.id}:elara:${i}`, world: c.world, source: t.program, skipped: t.skipped, prompt });
  });
  const saved = process.env.FIXDIR ? readdirSync(`${process.env.FIXDIR}/${c.world}`).find((f) => f.startsWith(`request-${c.id.toLowerCase().replace(/^([a-z])(\d)$/, "$10$2")}-`)) : null;
  runs.push({ id: `${c.id}:fix`, world: c.world, source: saved ? readFileSync(`${process.env.FIXDIR}/${c.world}/${saved}`, "utf8") : c.fix });
}
GOOD.forEach((g, i) => {
  const t = translate(g.prompt, g.world, {});
  runs.push({ id: `G${i}:elara:0`, world: g.world, source: t.program, skipped: t.skipped, prompt: g.prompt });
});
writeFileSync("runs-in.json", JSON.stringify(runs, null, 1));
console.log(runs.length, "programs to run");
