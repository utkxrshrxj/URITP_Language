// Tests the runner's clock (real time, optionally sped up) and cancelling a wait, as STOP does.
// A sped-up clock lets tests cover minutes of program time in a few milliseconds.
import { describe, expect, it } from "vitest";
import { CancelSignal, realClock } from "../../src/runtime/clock.js";

describe("realClock", () => {
  it("starts at zero and moves forward", async () => {
    const clock = realClock({ speed: 1000 });
    expect(clock.now()).toBeLessThan(0.5);
    await clock.sleep(5);
    expect(clock.now()).toBeGreaterThanOrEqual(4.9);
  });

  it("runs faster than real time when asked", async () => {
    const clock = realClock({ speed: 1000 });
    const before = Date.now();
    await clock.sleep(30);
    expect(Date.now() - before).toBeLessThan(500);
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
