/**
 * Emits one navigation direction for each uninterrupted stream of wheel input.
 *
 * Call consume only for wheel events that the stage owns, after choosing the
 * dominant axis and applying deltaMode scaling. Keep keyboard, click and drag
 * navigation outside this gate. A browser WheelEvent has no gesture ID, so the
 * quiet interval is a conservative heuristic: two quick physical gestures can
 * merge, and an unusually long pause within momentum can split one gesture.
 */
export class WheelGestureGate {
  private lastInputAt: number | null = null;
  private fired = false;
  readonly quietMs: number;
  readonly minMagnitude: number;

  constructor(
    quietMs = 600,
    minMagnitude = 0.1,
  ) {
    if (!Number.isFinite(quietMs) || quietMs <= 0) {
      throw new RangeError('quietMs must be a positive finite number');
    }
    if (!Number.isFinite(minMagnitude) || minMagnitude < 0) {
      throw new RangeError('minMagnitude must be a nonnegative finite number');
    }
    this.quietMs = quietMs;
    this.minMagnitude = minMagnitude;
  }

  /** An explicit click/key/drag selection ends the previous wheel interaction. */
  reset(): void {
    this.lastInputAt = null;
    this.fired = false;
  }

  /** Returns -1 or +1 only on the first valid event of a quiet-delimited stream. */
  consume(delta: number, timestamp: number): -1 | 0 | 1 {
    if (!Number.isFinite(delta) || !Number.isFinite(timestamp) ||
        Math.abs(delta) < this.minMagnitude || delta === 0) return 0;

    // The caller supplies a monotonic clock, normally performance.now().
    // Discard stale samples instead of letting them rewind the quiet interval.
    if (this.lastInputAt !== null && timestamp < this.lastInputAt) return 0;

    if (this.lastInputAt === null || timestamp - this.lastInputAt >= this.quietMs) {
      this.fired = false;
    }
    this.lastInputAt = timestamp;
    if (this.fired) return 0;
    this.fired = true;
    return delta > 0 ? 1 : -1;
  }
}
