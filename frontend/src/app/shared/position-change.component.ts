import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Places gained or lost since the previous round, timing-screen style. */
@Component({
  selector: 'app-position-change',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (change() !== null) {
      <span class="delta" [class]="tone()" [attr.aria-label]="label()" [title]="label()">
        {{ glyph() }}
      </span>
    }
  `,
})
export class PositionChangeComponent {
  readonly change = input<number | null>(null);

  readonly tone = computed(() => {
    const value = this.change() ?? 0;
    return `delta ${value > 0 ? 'up' : value < 0 ? 'down' : 'same'}`;
  });

  readonly glyph = computed(() => {
    const value = this.change() ?? 0;
    if (value > 0) {
      return `▲${value}`;
    }
    if (value < 0) {
      return `▼${Math.abs(value)}`;
    }
    return '–';
  });

  readonly label = computed(() => {
    const value = this.change() ?? 0;
    if (value === 0) {
      return 'No change since the previous round';
    }
    const places = Math.abs(value) === 1 ? 'place' : 'places';
    return `${value > 0 ? 'Gained' : 'Lost'} ${Math.abs(value)} ${places} since the previous round`;
  });
}
