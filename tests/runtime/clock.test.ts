// Tests the runner's clock (real time, optionally sped up) and cancelling a wait, as STOP does.
// A sped-up clock lets tests cover minutes of program time in a few milliseconds.
import { describe, expect, it } from "vitest";
import { CancelSignal, realClock } from "../../src/runtime/clock.js";

describe("realClock", () => {
  it("starts at zero", () => {
    // At normal speed, so a busy machine cannot make a few milliseconds look like seconds.
    expect(realClock().now()).toBeLessThan(0.5);
  });

  it("moves forward as it waits", async () => {
    const clock = realClock({ speed: 1000 });
    await clock.sleep(5);
    expect(clock.now()).toBeGreaterThanOrEqual(4.9);
  });

  it("runs faster than real time when asked", async () => {
    const clock = realClock({ speed: 1000 });
    const before = Date.now();
    await clock.sleep(30);
    expect(Date.now() - before).toBeLessThan(500);
  });

  it("never returns early", async () => {
    for (const seconds of [0.002, 0.005, 0.013]) {
      const clock = realClock();
      await clock.sleep(seconds);
      expect(clock.now()).toBeGreaterThanOrEqual(seconds);
    }
  });

  it("can wait longer than one timer allows, until cancelled", async () => {
    // A single timer cannot wait more than about 24 days; it would fire at once instead.
    const clock = realClock();
    const signal = new CancelSignal();
    let done = false;
    const waiting = clock.sleep(1e9, signal).then(() => (done = true));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(done).toBe(false);
    signal.cancel("STOP");
    await waiting;
    expect(done).toBe(true);
  });

  it("returns at once for zero or negative waits", async () => {
    await realClock().sleep(0);
    await realClock().sleep(-1);
  });

  it("stops waiting when cancelled", async () => {
    const clock = realClock();
    const signal = new CancelSignal();
    const before = Date.now();
    const waiting = clock.sleep(60, signal);
    signal.cancel("STOP");
    await waiting;
    expect(Date.now() - before).toBeLessThan(500);
  });
});

describe("CancelSignal", () => {
  it("remembers the first reason and tells every listener once", () => {
    const signal = new CancelSignal();
    let calls = 0;
    signal.onCancel(() => calls++);
    signal.cancel("STOP");
    signal.cancel("again");
    expect(signal).toMatchObject({ cancelled: true, reason: "STOP" });
    expect(calls).toBe(1);
  });

  it("calls a late listener at once", () => {
    const signal = new CancelSignal();
    signal.cancel("STOP");
    let called = false;
    signal.onCancel(() => (called = true));
    expect(called).toBe(true);
  });

  it("lets a listener stop listening", () => {
    const signal = new CancelSignal();
    let called = false;
    const stop = signal.onCancel(() => (called = true));
    stop();
    signal.cancel("STOP");
    expect(called).toBe(false);
  });
});
