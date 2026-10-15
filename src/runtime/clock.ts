// Time for the runner: how long the program has been running, and waiting that STOP can cut short.
// The clock can run faster than real time, so tests and simulations do not have to wait.

/** Lets one part of the runner tell others to give up, for STOP and cancelled tasks. */
export class CancelSignal {
  private reasonText: string | null = null;
  private readonly listeners = new Set<() => void>();

  get cancelled(): boolean {
    return this.reasonText !== null;
  }

  get reason(): string {
    return this.reasonText ?? "";
  }

  cancel(reason: string): void {
    if (this.reasonText !== null) return;
    this.reasonText = reason;
    for (const listener of [...this.listeners]) listener();
    this.listeners.clear();
  }

  /** Calls `listener` once when cancelled (at once if already cancelled). Returns a way to stop listening. */
  onCancel(listener: () => void): () => void {
    if (this.cancelled) {
      listener();
      return () => {};
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export interface Clock {
  /** Seconds since the clock was made, which is when the program started (D9). */
  now(): number;
  /** Waits `seconds`, or less if `signal` is cancelled first. */
  sleep(seconds: number, signal?: CancelSignal): Promise<void>;
}

// setTimeout exists in browsers and in Node, but the core is compiled without either one's
// type definitions, so it is looked up on globalThis with the small shape we need.
interface Timers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
const timers = globalThis as unknown as Timers;

/** The longest a single timer can wait, in milliseconds; longer waits would fire at once. */
const LONGEST_TIMER_MS = 2_147_483_647;

/** Milliseconds from a steady source: performance.now() where there is one (browsers and Node). */
const performanceNow = (globalThis as unknown as { performance?: { now(): number } }).performance;
const milliseconds = (): number => (performanceNow === undefined ? Date.now() : performanceNow.now());

/** Waits up to `ms` real milliseconds, or less if `signal` is cancelled first. */
function waitReal(ms: number, signal?: CancelSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    let stopListening = (): void => {};
    const handle = timers.setTimeout(() => {
      stopListening();
      resolve();
    }, ms);
    if (signal !== undefined) {
      stopListening = signal.onCancel(() => {
        timers.clearTimeout(handle);
        resolve();
      });
    }
  });
}

/**
 * A clock that follows real time. With `speed` above 1 it runs that many times faster, so a
 * 2 minute wait at speed 1000 takes 0.12 real seconds while the program still sees 2 minutes.
 */
export function realClock(options: { speed?: number } = {}): Clock {
  const speed = options.speed ?? 1;
  const start = milliseconds();
  const now = (): number => ((milliseconds() - start) / 1000) * speed;
  return {
    now,
    // Waits in pieces, checking the time after each one: timers can fire a little early, and a
    // single timer cannot wait longer than about 24 days (it would fire at once instead).
    sleep: async (seconds, signal) => {
      const end = now() + seconds;
      while (signal?.cancelled !== true) {
        const remaining = end - now();
        if (remaining <= 0) return;
        await waitReal(Math.min(Math.max(1, (remaining * 1000) / speed), LONGEST_TIMER_MS), signal);
      }
    },
  };
}
