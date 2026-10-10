import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const WIDTH = 72;
const HEIGHT = 20;
const PAD = 2;

/** Tiny cumulative-points trace; the scale is shared across a table via `max`. */
@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      role="img"
      [attr.aria-label]="label()"
    >
      <line [attr.x1]="0" [attr.x2]="width" [attr.y1]="height - pad" [attr.y2]="height - pad" class="base" />
      @if (points().length > 1) {
        <polyline [attr.points]="path()" [attr.stroke]="color()" />
      }
      @if (last(); as dot) {
        <circle [attr.cx]="dot.x" [attr.cy]="dot.y" r="2" [attr.fill]="color()" />
      }
    </svg>
  `,
  styles: `
    :host { display: inline-flex; vertical-align: middle; width: 100%; max-width: 72px; }
    svg { width: 100%; height: auto; }
    .base { stroke: var(--line-strong); stroke-width: 1; }
    polyline { fill: none; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
  `,
})
export class SparklineComponent {
  readonly values = input.required<number[]>();
  readonly max = input<number | null>(null);
  readonly color = input('var(--text)');
  readonly label = input('Points after each round');

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly pad = PAD;

  readonly points = computed(() => {
    const values = this.values();
    const top = Math.max(this.max() ?? 0, ...values, 1);
    const steps = Math.max(values.length - 1, 1);
    return values.map((value, index) => ({
      x: PAD + (index / steps) * (WIDTH - PAD * 2),
      y: HEIGHT - PAD - (value / top) * (HEIGHT - PAD * 2),
    }));
  });

  readonly path = computed(() =>
    this.points()
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(' ')
  );

  readonly last = computed(() => {
    const points = this.points();
    return points.length ? points[points.length - 1] : null;
  });
}
