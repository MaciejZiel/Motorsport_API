import { Injectable, inject, signal } from '@angular/core';
import { MotorsportApiService } from './motorsport-api.service';

export type ApiStatus = 'checking' | 'waking' | 'online' | 'offline';

/** Requests slower than this are almost always a sleeping free-tier instance. */
export const COLD_START_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ApiStatusService {
  private readonly api = inject(MotorsportApiService);

  readonly status = signal<ApiStatus>('checking');
  /** Round-trip time of the last health check, in milliseconds. */
  readonly latencyMs = signal<number | null>(null);

  check(): void {
    const started = performance.now();
    this.status.set('checking');
    const slowTimer = setTimeout(() => this.status.set('waking'), COLD_START_MS);

    this.api.getHealth().subscribe({
      next: (health) => {
        clearTimeout(slowTimer);
        this.latencyMs.set(Math.round(performance.now() - started));
        this.status.set(health.status === 'ok' ? 'online' : 'offline');
      },
      error: () => {
        clearTimeout(slowTimer);
        this.latencyMs.set(null);
        this.status.set('offline');
      },
    });
  }
}
