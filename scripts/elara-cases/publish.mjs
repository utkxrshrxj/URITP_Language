// Writes the corrected programs into the repo, the Markdown report, and the HTML for the PDF,
// all from report.json (made by judge.mjs).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const { CASES, PATTERNS } = await import("./cases.mjs");
const [repo, htmlOut, commit] = process.argv.slice(2);
const report = JSON.parse(readFileSync("report.json", "utf8"));

const SLUG = {
  K1: "side-by-side-on-the-shelf", K2: "side-by-side-hinglish", K3: "both-on-the-plate", K4: "ball-and-cube-in-the-basket",
  K5: "three-things-on-the-shelf", K6: "three-things-in-the-basket", K7: "tidy-everything", K8: "ball-next-to-the-cup",
  K9: "swap-ball-and-cube", K10: "bring-it-back", K11: "plate-wait-then-basket", K12: "cube-left-of-the-ball",
  K13: "say-how-far", K14: "only-what-is-close", T1: "not-the-school", T2: "do-not-go-to-the-school",
  T3: "skip-the-post-office", T4: "around-the-flowers", T5: "wait-at-the-shop", T6: "every-place",
  T7: "drive-a-square", T8: "nearest-place", T9: "say-how-far", T10: "school-first",
  W1: "aisle-b-then-packing", W2: "blocked-aisle", W3: "wait-to-be-loaded", W4: "avoid-the-forklift-lane",
  F1: "photo-of-p1", F2: "spray-row-one", F3: "barn-and-back", X1: "weld-the-seam", X2: "jig-then-weld", X3: "plate-to-the-bin",
};
const WORLD = { kitchen: "Kitchen (robot arm)", town: "Town (rover)", warehouse: "Warehouse (cart)", farm: "Farm (drone)", factory: "Factory (welder and picker)" };
const SHORT = {
  "same-spot": "landed on the same spot", "first-only": "only one thing moved", groups: "group words not understood",
  negation: "\"not\" ignored", "avoid-into": "zone to avoid became a target", "it-and-back": "picked \"it\" up from the wrong place",
  "unknown-words": "words dropped", "say-value": "said the words, not the answer", order: "\"first\" ignored",
  "world-not-supported": "only say understood here",
};
const fileOf = (c) => `sandboxes/${c.world}/request-${c.id.toLowerCase().replace(/^([a-z])(\d)$/, "$10$2")}-${SLUG[c.id]}.uritp`;
const body = (src) => src.split("\n").filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").replace(/\n+$/, "");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const prep = (line) => line.replace(/in the (shelf|plate)/g, "on the $1");

// ---- the corrected programs, in the world folders --------------------------------------------
for (const c of report.cases) {
  const cs = CASES.find((x) => x.id === c.id);
  const head = `# Request to Elara: "${cs.prompts[0]}"\n# What it asks: ${cs.asked}\n`;
  const path = join(repo, fileOf(c));
  writeFileSync(path, head + body(cs.fix) + "\n");
  c.file = fileOf(c);
}

const casesOf = (p) => report.cases.filter((c) => c.pattern === p).map((c) => c.id);
const phrasings = report.cases.reduce((n, c) => n + c.elara.length, 0);

// ---- Markdown (for the repo) ---------------------------------------------------------------
const md = [];
md.push("# Elara translation cases", "",
  "Requests where Elara, the URITP playground's built-in translator, writes a program that runs but does not do",
  "what the person asked, each with a corrected URITP program that does. Made from the playground at commit",
  `\`${commit}\` (github.com/senthuran2107/URITP).`, "",
  `- **${report.cases.length} requests** (${phrasings} wordings) where Elara's program does not do what was asked. Every corrected program does,`,
  "  checked on the playground's own engine and scene, and is in this repository next to its world's map.",
  `- **${report.good.length} requests** Elara gets right, checked the same way, are listed at the end.`, "",
  "A PDF of this report is made from the same data.", "",
  "## Summary", "", "| Case | Request | What went wrong | Corrected program |", "|---|---|---|---|");
for (const c of report.cases) md.push(`| ${c.id} | ${c.elara.map((e) => `"${e.prompt}"`).join("<br>")} | ${SHORT[c.pattern]} | [\`${c.file.split("/").pop()}\`](${c.file.replace("sandboxes/", "")}) |`);
md.push("", "## Patterns, and what the translator needs", "");
for (const [p, [title, why, need]] of Object.entries(PATTERNS)) {
  md.push(`### ${title}`, "", why, "", `**What Elara needs:** ${need}`, "", `Cases: ${casesOf(p).join(", ")}`, "");
}
md.push("## The cases", "");
for (const c of report.cases) {
  md.push(`### ${c.id}. ${WORLD[c.world]}: ${SHORT[c.pattern]}`, "");
  for (const e of c.elara) md.push(`> "${e.prompt}"`, "");
  md.push(`**What it asks:** ${c.asked}`, "");
  const e0 = c.elara[0];
  md.push("**Elara's program:**", "", "```", body(e0.source), "```", "");
  if (e0.skipped.length) md.push(`Elara reported as skipped: ${e0.skipped.map((s) => `"${s}"`).join(", ")}`, "");
  md.push("**What happened:**", "", ...e0.happened.map((h) => `- ${prep(h)}`), "");
  for (const e of c.elara.slice(1)) {
    md.push(`For "${e.prompt}", Elara wrote:`, "", "```", body(e.source), "```", "", ...e.happened.map((h) => `- ${prep(h)}`), "");
  }
  md.push(`**Why:** ${c.why}`, "", `**Corrected program** ([\`${c.file.split("/").pop()}\`](${c.file.replace("sandboxes/", "")})):`, "",
    "```", body(CASES.find((x) => x.id === c.id).fix), "```", "", "**What happens now:**", "", ...c.fixHappened.map((h) => `- ${prep(h)}`), "");
}
md.push("## Requests Elara gets right", "", "Checked the same way: each of these does what was asked.", "", "| World | Request |", "|---|---|");
for (const g of report.good) md.push(`| ${g.world} | "${g.prompt}" |`);
md.push("", "## How these were checked", "",
  "1. Each request went through the playground's own translator (`playground/js/translate.js`), as typed into the page.",
  "2. Each program, Elara's and the corrected one, was checked and run by the playground's engine (`playground/py/bridge.py`), then played on its headless scene (`playground/js/scene.js`), the same way the page judges exercises.",
  "3. A check written for each request says whether the scene matches what was asked: for example, the ball and the cube both on the shelf and at least 8cm apart.",
  "4. Every corrected program also passes this URITP's checker (`tests/sandboxes.test.ts`).", "",
  "Only the built-in translator was tested. With the optional AI helper switched on, the playground first asks Gemini when the built-in translator misses part of a sentence, so results there can differ.", "");
writeFileSync(join(repo, "sandboxes", "ELARA_TRANSLATION_CASES.md"), md.join("\n"));

// ---- HTML (for the PDF) --------------------------------------------------------------------
const code = (src) => `<pre><code>${esc(body(src))}</code></pre>`;
const list = (items) => `<ul>${items.map((h) => `<li>${esc(prep(h))}</li>`).join("")}</ul>`;
const h = [];
h.push(`<!doctype html><html><head><meta charset="utf-8"><title>Elara translation cases</title><style>
@page { size: A4; margin: 16mm 15mm; }
:root { --ink:#1f2328; --muted:#59636e; --line:#d0d7de; --bad:#b42318; --badbg:#fef3f2; --good:#067647; --goodbg:#ecfdf3; --accent:#3b5bdb; }
body { font-family: -apple-system, "Helvetica Neue", "Kohinoor Devanagari", sans-serif; font-size: 10pt; line-height: 1.45; color: var(--ink); }
h1 { font-size: 24pt; margin: 0 0 6pt; } h2 { font-size: 15pt; border-bottom: 1px solid var(--line); padding-bottom: 3pt; margin-top: 20pt; page-break-after: avoid; }
h3 { font-size: 12pt; margin: 14pt 0 4pt; page-break-after: avoid; }
.lead { font-size: 11pt; color: var(--muted); }
.stats { display: flex; gap: 10pt; margin: 14pt 0; } .stat { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 8pt 10pt; }
.stat b { display: block; font-size: 20pt; } .stat.bad b { color: var(--bad); } .stat.good b { color: var(--good); }
table { border-collapse: collapse; width: 100%; font-size: 8.8pt; margin: 6pt 0; } th, td { border: 1px solid var(--line); padding: 3pt 5pt; text-align: left; vertical-align: top; }
th { background: #f6f8fa; } tr { page-break-inside: avoid; }
code, pre { font-family: "SF Mono", Menlo, "Kohinoor Devanagari", monospace; }
pre { background: #f6f8fa; border: 1px solid var(--line); border-radius: 6px; padding: 6pt 8pt; font-size: 7.6pt; line-height: 1.32; white-space: pre-wrap; margin: 3pt 0 6pt; }
.case { border-top: 2px solid var(--line); padding-top: 4pt; margin-top: 12pt; break-inside: avoid; page-break-inside: avoid; }
.case h3 { margin-top: 4pt; } .tag { display: inline-block; font-size: 8pt; padding: 1pt 6pt; border-radius: 10px; background: #eef2ff; color: var(--accent); margin-left: 4pt; vertical-align: middle; }
.request { font-size: 11pt; font-style: italic; margin: 2pt 0; }
.cols { display: flex; gap: 10pt; } .cols > div { flex: 1; min-width: 0; }
.box { border-radius: 6px; padding: 4pt 8pt; margin: 3pt 0; page-break-inside: avoid; } .box.bad { background: var(--badbg); } .box.good { background: var(--goodbg); }
.box h4 { margin: 2pt 0; font-size: 9.5pt; } .box.bad h4 { color: var(--bad); } .box.good h4 { color: var(--good); }
.box ul { margin: 2pt 0 2pt 14pt; padding: 0; font-size: 9pt; }
.note { color: var(--muted); font-size: 9pt; } .pattern { border-left: 3px solid var(--accent); padding-left: 8pt; margin: 8pt 0; page-break-inside: avoid; }
.pagebreak { page-break-before: always; }
</style></head><body>`);
h.push(`<h1>Elara translation cases</h1><p class="lead">Requests where the URITP playground's built-in translator writes a program that runs, but does not do what the person asked; and the URITP program that does.</p>`);
h.push(`<div class="stats"><div class="stat bad"><b>${report.cases.length}</b>requests (${phrasings} wordings) where Elara's program does not do what was asked</div><div class="stat good"><b>${report.cases.length}</b>corrected programs, each checked on the playground: every one does what was asked</div><div class="stat"><b>${report.good.length}</b>requests Elara already gets right, checked the same way</div></div>`);
h.push(`<p>The example that started this: <i>"keep red ball on the shelf and then keep blue cube also on the shelf keep them side by side not on top of the other"</i>. Elara's program put both on the exact centre of the shelf, so the cube hid the ball. The corrected program gives each its own spot on the shelf, 14cm apart (case K1).</p>`);
h.push(`<p class="note">Tested against the playground at commit <code>${commit}</code> (github.com/senthuran2107/URITP), using its own translator, engine and scene. Only the built-in translator was tested, not the optional Gemini helper. Each corrected program is in this repository as <code>sandboxes/&lt;world&gt;/request-*.uritp</code> and also passes this URITP's checker.</p>`);
h.push(`<h2>Summary</h2><table><tr><th>Case</th><th>Request</th><th>What went wrong</th><th>Fixed</th></tr>`);
for (const c of report.cases) h.push(`<tr><td><b>${c.id}</b></td><td>${c.elara.map((e) => `"${esc(e.prompt)}"`).join("<br>")}</td><td>${esc(SHORT[c.pattern])}</td><td style="color:var(--good)">✓</td></tr>`);
h.push(`</table>`);
h.push(`<h2 class="pagebreak">Patterns, and what the translator needs</h2><p>The ${report.cases.length} cases come from ${Object.keys(PATTERNS).length} patterns. Fixing a pattern in the translator fixes every case in it, and requests like them.</p>`);
for (const [p, [title, why, need]] of Object.entries(PATTERNS)) h.push(`<div class="pattern"><h3>${esc(title)}</h3><p>${esc(why)}</p><p><b>What Elara needs:</b> ${esc(need)}</p><p class="note">Cases: ${casesOf(p).join(", ")}</p></div>`);
let lastWorld = "";
for (const c of report.cases) {
  const cs = CASES.find((x) => x.id === c.id);
  if (c.world !== lastWorld) { h.push(`<h2 class="pagebreak">${WORLD[c.world]}</h2>`); lastWorld = c.world; }
  const e0 = c.elara[0];
  h.push(`<div class="case"><h3>${c.id}<span class="tag">${esc(SHORT[c.pattern])}</span></h3>`);
  for (const e of c.elara) h.push(`<p class="request">"${esc(e.prompt)}"</p>`);
  h.push(`<p><b>What it asks:</b> ${esc(c.asked)}</p>`);
  h.push(`<div class="cols"><div><b>Elara's program</b>${code(e0.source)}</div><div><b>Corrected program</b>${code(cs.fix)}</div></div>`);
  h.push(`<div class="cols"><div class="box bad"><h4>What happened</h4>${list(e0.happened)}${e0.skipped.length ? `<p class="note">Elara reported as skipped: ${e0.skipped.map((s) => `"${esc(s)}"`).join(", ")}</p>` : ""}</div><div class="box good"><h4>What happens now</h4>${list(c.fixHappened)}</div></div>`);
  for (const e of c.elara.slice(1)) h.push(`<p class="note">For "${esc(e.prompt)}", Elara wrote:</p>${code(e.source)}<div class="box bad">${list(e.happened)}</div>`);
  h.push(`<p><b>Why:</b> ${esc(c.why)}</p><p class="note">Corrected program: <code>${esc(c.file)}</code></p></div>`);
}
h.push(`<h2 class="pagebreak">Requests Elara gets right</h2><p>Checked the same way. Elara handles one thing per place, a clear order of places, and "not" when it comes after a comma.</p><table><tr><th>World</th><th>Request</th><th>Elara's program</th></tr>`);
for (const g of report.good) h.push(`<tr><td>${g.world}</td><td>"${esc(g.prompt)}"</td><td><pre><code>${esc(body(g.source).split("\n").filter((l) => !/^(import|robot) /.test(l) && l).join("\n"))}</code></pre></td></tr>`);
h.push(`</table><h2>How these were checked</h2><ol>
<li>Each request went through the playground's own translator (<code>playground/js/translate.js</code>), exactly as if typed into the page.</li>
<li>Each program, Elara's and the corrected one, was checked and run by the playground's engine (<code>playground/py/bridge.py</code>) and played on its headless scene (<code>playground/js/scene.js</code>), the way the page judges exercises.</li>
<li>A check written for each request says whether the scene matches what was asked: for K1, both things on the shelf and at least 8cm apart. Elara's program fails it for every wording; the corrected program passes it, and the run ends as "finished".</li>
<li>Every corrected program also passes this URITP's checker (<code>tests/sandboxes.test.ts</code>).</li></ol></body></html>`);
writeFileSync(htmlOut, h.join("\n"));
console.log("wrote", report.cases.length, "programs, the Markdown report and", htmlOut);
