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

/**
 * A clock that follows real time. With `speed` above 1 it runs that many times faster, so a
 * 2 minute wait at speed 1000 takes 0.12 real seconds while the program still sees 2 minutes.
 */
export function realClock(options: { speed?: number } = {}): Clock {
  const speed = options.speed ?? 1;
  const start = Date.now();
  return {
    now: () => ((Date.now() - start) / 1000) * speed,
    sleep: (seconds, signal) =>
      new Promise<void>((resolve) => {
        if (signal?.cancelled === true || seconds <= 0) {
          resolve();
          return;
        }
        let stopListening = (): void => {};
        const handle = timers.setTimeout(() => {
          stopListening();
          resolve();
        }, (seconds * 1000) / speed);
        if (signal !== undefined) {
          stopListening = signal.onCancel(() => {
            timers.clearTimeout(handle);
            resolve();
          });
        }
      }),
  };
}
