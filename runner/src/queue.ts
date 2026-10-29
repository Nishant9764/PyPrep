/**
 * Bounded slot pool. Each running job owns one slot number, which maps to its own sandbox
 * uid, so jobs cannot signal or inspect each other and per-uid process limits stay per job.
 */
export class SlotPool {
  private free: number[];
  private waiters: Array<(slot: number) => void> = [];

  constructor(
    private readonly size: number,
    private readonly maxQueue: number,
  ) {
    this.free = Array.from({ length: size }, (_, i) => i);
  }

  get queued(): number {
    return this.waiters.length;
  }

  /** Resolves with a slot, or rejects with "busy" when the waiting line is full. */
  acquire(): Promise<number> {
    const slot = this.free.pop();
    if (slot !== undefined) return Promise.resolve(slot);
    if (this.waiters.length >= this.maxQueue) return Promise.reject(new Error('busy'));
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  release(slot: number): void {
    const next = this.waiters.shift();
    if (next) next(slot);
    else this.free.push(slot);
  }

  async withSlot<T>(fn: (slot: number) => Promise<T>): Promise<T> {
    const slot = await this.acquire();
    try {
      return await fn(slot);
    } finally {
      this.release(slot);
    }
  }
}
