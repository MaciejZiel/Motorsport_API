import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { COLD_START_MS } from '../core/api-status.service';

export type LoadState = 'loading' | 'ready' | 'error';

/** Loading and error states shared by every data screen. */
@Component({
  selector: 'app-load-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state() === 'loading') {
      <div class="loading" role="status" aria-live="polite">
        <div class="sweep" aria-hidden="true"><span></span></div>
        <p>Loading {{ subject() }}</p>
        @if (slow()) {
          <p class="slow">
            The API is slow to answer. If it was idle, the first request can take a while.
          </p>
        }
      </div>
    } @else if (state() === 'error') {
      <div class="notice is-error" role="alert">
        <strong>Couldn't load {{ subject() }}</strong>
        <p>{{ message() || 'The API did not respond. Check your connection and try again.' }}</p>
        <button class="btn retry" type="button" (click)="retry.emit()">Try again</button>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .loading { padding: 28px 0; color: var(--muted); }
    .sweep { position: relative; height: 2px; max-width: 320px; margin-bottom: 12px; background: var(--line); overflow: hidden; }
    .sweep span { position: absolute; inset: 0 auto 0 0; width: 30%; background: var(--text); animation: sweep 1.1s ease-in-out infinite; }
    .slow { margin-top: 8px; max-width: 60ch; color: var(--flag-yellow); }
    .retry { margin-top: 12px; }
    @keyframes sweep { from { transform: translateX(-100%); } to { transform: translateX(340%); } }
  `,
})
export class LoadStateComponent {
  readonly state = input.required<LoadState>();
  readonly subject = input('data');
  readonly message = input<string | null>(null);
  readonly retry = output<void>();

  readonly slow = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
    effect(() => {
      this.clearTimer();
      this.slow.set(false);
      if (this.state() === 'loading') {
        this.timer = setTimeout(() => this.slow.set(true), COLD_START_MS);
      }
    });
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
