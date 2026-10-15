// The browser demo: speak or type a request, see the URITP program the offline translator writes,
// the checker's verdict, and the instructions a simulated rover receives. No API key is used here.
import { handleRequest } from "../dist/src/nl/handle-request.js";
import { RuleBasedTranslator } from "../dist/src/nl/rule-based.js";
import { formatInstruction } from "../dist/src/codegen/instruction.js";
import { CancelSignal, realClock } from "../dist/src/runtime/clock.js";
import { formatDiagnostic } from "../dist/src/diagnostics/diagnostic.js";

const MANIFEST = [
  'manifest "Demo rover (simulated)":',
  "    uritp 0.1",
  "    frame base: pose2d max_speed 0.5m/s",
  "    sensor camera: rgb",
  "    profiles [core, navigation, vision, speech]",
  "    safety max_speed 0.3m/s",
  "    safety forbidden_zone zones.stairs",
].join("\n");

const SITE = [
  "define place kitchen = pose(4m, 1m, 0m)",
  "define place door = pose(0m, 3.5m, 0m)",
  "define place dock = pose(0.5m, 0.5m, 0m)",
  "define zone stairs = polygon(pose(8m, 0m, 0m), pose(10m, 0m, 0m), pose(10m, 2m, 0m), pose(8m, 2m, 0m))",
].join("\n");

const $ = (id) => document.getElementById(id);
const clock = realClock({ speed: 5 });

/** A simulated rover: it follows the task lifecycle and shows every instruction it receives. */
const rover = {
  running: new Set(),
  async run(instruction, update) {
    update({ state: "accepted" });
    update({ state: "running" });
    const line = document.createElement("li");
    line.textContent = formatInstruction(instruction);
    $("instructions").append(line);
    const signal = new CancelSignal();
    this.running.add(signal);
    await clock.sleep(instruction.name === "SENSE" ? 0.1 : 2, signal);
    this.running.delete(signal);
    update(signal.cancelled ? { state: "cancelled", reason: "stopped" } : { state: "succeeded" });
  },
  async stop() {
    for (const signal of this.running) signal.cancel("STOP");
  },
};

async function submit(text) {
  if (text.trim() === "") return;
  $("request").textContent = text;
  $("program").textContent = "";
  $("verdict").textContent = "Translating and checking…";
  $("verdict").className = "";
  $("instructions").replaceChildren();
  const outcome = await handleRequest({
    text,
    translator: new RuleBasedTranslator(),
    robots: { rover: { address: "demo:rover", manifest: { name: "rover.uritp", source: MANIFEST }, port: rover } },
    siteMaps: [{ name: "site.uritp", source: SITE }],
    clock,
  });
  if (outcome.stage === "not-understood") {
    $("verdict").textContent = outcome.reason;
    $("verdict").className = "bad";
    return;
  }
  $("program").textContent = outcome.program;
  if (outcome.stage === "rejected") {
    $("verdict").textContent = "Rejected before anything moved:\n" + outcome.diagnostics.map((d) => formatDiagnostic(d)).join("\n");
    $("verdict").className = "bad";
    return;
  }
  $("verdict").textContent = `Checked and run: ${outcome.explanation}. The task ended as ${outcome.result.state}.`;
  $("verdict").className = outcome.result.state === "succeeded" ? "good" : "bad";
}

$("form").addEventListener("submit", (event) => {
  event.preventDefault();
  void submit($("text").value);
});
for (const button of document.querySelectorAll("[data-example]")) {
  button.addEventListener("click", () => {
    $("text").value = button.dataset.example;
    void submit(button.dataset.example);
  });
}

// Speech input through the Web Speech API, where the browser has it.
const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
if (Recognition === undefined) {
  $("speak").disabled = true;
  $("speak").title = "This browser has no speech recognition; type instead.";
} else {
  $("speak").addEventListener("click", () => {
    const recognition = new Recognition();
    recognition.lang = $("language").value;
    recognition.onresult = (event) => {
      const heard = event.results[0][0].transcript;
      $("text").value = heard;
      void submit(heard);
    };
    recognition.onerror = (event) => {
      $("verdict").textContent = `Could not hear you (${event.error}). You can type instead.`;
      $("verdict").className = "bad";
    };
    recognition.start();
    $("verdict").textContent = "Listening…";
    $("verdict").className = "";
  });
}
