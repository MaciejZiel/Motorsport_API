import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

export interface PointsChartEntry {
  raceId: number;
  raceName: string;
  season: number;
  round: number;
  points: number;
}

const DEFAULT_WIDTH = 640;
const MIN_WIDTH = 300;
const H = 240;
const M = { top: 28, right: 16, bottom: 36, left: 40 };

function niceStep(max: number): number {
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  const normalized = rough / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Career points progression: a line of cumulative points with the points
 * scored in each race as bars underneath. Seasons are separated by a rule.
 */
@Component({
  selector: 'app-points-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + w() + ' ' + h" role="img" [attr.aria-label]="summary()">
      <g class="grid">
        @for (tick of ticks(); track tick.value) {
          <line [attr.x1]="m.left" [attr.x2]="w() - m.right" [attr.y1]="tick.y" [attr.y2]="tick.y" />
          <text class="axis" [attr.x]="m.left - 8" [attr.y]="tick.y + 4" text-anchor="end">{{ tick.value }}</text>
        }
      </g>
      @for (divider of seasons(); track divider.season) {
        @if (divider.x !== null) {
          <line class="season-rule" [attr.x1]="divider.x" [attr.x2]="divider.x" [attr.y1]="m.top - 16" [attr.y2]="h - m.bottom" />
        }
        <text class="season" [attr.x]="divider.labelX" [attr.y]="m.top - 12">{{ divider.season }}</text>
      }
      @for (bar of bars(); track bar.raceId) {
        <rect class="bar" [attr.x]="bar.x - barWidth() / 2" [attr.y]="bar.y" [attr.width]="barWidth()" [attr.height]="bar.height" [attr.fill]="color()">
          <title>{{ bar.title }}</title>
        </rect>
        <text class="axis" [attr.x]="bar.x" [attr.y]="h - m.bottom + 16" text-anchor="middle">R{{ bar.round }}</text>
      }
      <path class="line" [attr.d]="linePath()" [attr.stroke]="color()" />
      @for (dot of dots(); track dot.raceId) {
        <circle [attr.cx]="dot.x" [attr.cy]="dot.y" r="3.5" [attr.fill]="color()">
          <title>{{ dot.title }}</title>
        </circle>
      }
      @if (lastDot(); as dot) {
        <text class="total" [attr.x]="dot.x - 8" [attr.y]="dot.y - 10" text-anchor="end">{{ dot.total }}</text>
      }
    </svg>
  `,
  styles: `
    :host { display: block; }
    svg { display: block; width: 100%; height: auto; overflow: visible; }
    .grid line { stroke: var(--line); stroke-width: 1; }
    .axis { fill: var(--muted); font: 11px var(--font-num); }
    .season { fill: var(--text); font: 600 12px var(--font-num); }
    .season-rule { stroke: var(--line-strong); stroke-dasharray: 3 4; }
    .bar { opacity: 0.32; }
    .line { fill: none; stroke-width: 2; stroke-linejoin: round; }
    .total { fill: var(--text); font: 600 13px var(--font-num); }
  `,
})
export class PointsChartComponent {
  readonly entries = input.required<PointsChartEntry[]>();
  readonly w = computed(() => this.width());

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(([entry]) => {
        const measured = Math.round(entry.contentRect.width);
        if (measured > 0) {
          this.width.set(Math.max(MIN_WIDTH, measured));
        }
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
  readonly color = input('#e8ecf0');

  /** Drawn at the rendered pixel width so labels keep their size on phones. */
  private readonly width = signal(DEFAULT_WIDTH);
  readonly h = H;
  readonly m = M;

  private readonly cumulative = computed(() => {
    let total = 0;
    return this.entries().map((entry) => (total += entry.points));
  });

  private readonly yMax = computed(() => {
    const max = Math.max(...this.cumulative(), 1);
    const step = niceStep(max);
    return Math.ceil(max / step) * step;
  });

  private readonly xStep = computed(() => (this.width() - M.left - M.right) / Math.max(this.entries().length, 1));

  private x(index: number): number {
    return M.left + this.xStep() * (index + 0.5);
  }

  private y(value: number): number {
    return H - M.bottom - (value / this.yMax()) * (H - M.top - M.bottom);
  }

  readonly barWidth = computed(() => Math.min(18, this.xStep() * 0.4));

  readonly ticks = computed(() => {
    const step = niceStep(this.yMax());
    const ticks: { value: number; y: number }[] = [];
    for (let value = 0; value <= this.yMax(); value += step) {
      ticks.push({ value, y: this.y(value) });
    }
    return ticks;
  });

  readonly bars = computed(() =>
    this.entries().map((entry, index) => ({
      raceId: entry.raceId,
      round: entry.round,
      x: this.x(index),
      y: this.y(entry.points),
      height: H - M.bottom - this.y(entry.points),
      title: `${entry.season} ${entry.raceName}: ${entry.points} pts`,
    }))
  );

  readonly dots = computed(() =>
    this.entries().map((entry, index) => ({
      raceId: entry.raceId,
      x: this.x(index),
      y: this.y(this.cumulative()[index]),
      total: this.cumulative()[index],
      title: `After ${entry.season} ${entry.raceName}: ${this.cumulative()[index]} pts`,
    }))
  );

  readonly lastDot = computed(() => this.dots().at(-1) ?? null);

  readonly linePath = computed(() => {
    const dots = this.dots();
    if (!dots.length) {
      return '';
    }
    const start = `M${(dots[0].x - this.xStep() / 2).toFixed(1)},${this.y(0).toFixed(1)}`;
    return start + dots.map((dot) => ` L${dot.x.toFixed(1)},${dot.y.toFixed(1)}`).join('');
  });

  readonly seasons = computed(() => {
    const entries = this.entries();
    const groups: { season: number; x: number | null; labelX: number }[] = [];
    entries.forEach((entry, index) => {
      if (index === 0 || entries[index - 1].season !== entry.season) {
        const edge = M.left + this.xStep() * index;
        groups.push({ season: entry.season, x: index === 0 ? null : edge, labelX: edge + 6 });
      }
    });
    return groups;
  });

  readonly summary = computed(() => {
    const totals = this.cumulative();
    const total = totals.at(-1) ?? 0;
    return `Cumulative points over ${this.entries().length} races, ending on ${total} points.`;
  });
}
