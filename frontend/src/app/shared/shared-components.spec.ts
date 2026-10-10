import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LoadState, LoadStateComponent } from './load-state.component';
import { PointsChartComponent, PointsChartEntry } from './points-chart.component';
import { PositionChangeComponent } from './position-change.component';
import { SparklineComponent } from './sparkline.component';

@Component({
  imports: [LoadStateComponent],
  template: `<app-load-state [state]="state()" subject="the standings" (retry)="retries = retries + 1" />`,
})
class LoadStateHost {
  readonly state = signal<LoadState>('loading');
  retries = 0;
}

describe('shared components', () => {
  afterEach(() => vi.useRealTimers());

  it('adds a slow-API hint to long loads and offers a retry on error', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(LoadStateHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Loading the standings');
    expect(el.querySelector('.slow')).toBeNull();

    vi.advanceTimersByTime(4500);
    fixture.detectChanges();
    expect(el.querySelector('.slow')).not.toBeNull();

    fixture.componentInstance.state.set('error');
    fixture.detectChanges();
    (el.querySelector('.retry') as HTMLButtonElement).click();
    expect(fixture.componentInstance.retries).toBe(1);
  });

  it('labels position changes', () => {
    const fixture = TestBed.createComponent(PositionChangeComponent);
    const el = fixture.nativeElement as HTMLElement;
    const cases: [number | null, string, string][] = [
      [2, '▲2', 'Gained 2 places'],
      [-1, '▼1', 'Lost 1 place'],
      [0, '–', 'No change'],
    ];
    for (const [change, glyph, label] of cases) {
      fixture.componentRef.setInput('change', change);
      fixture.detectChanges();
      expect(el.textContent?.trim()).toBe(glyph);
      expect(el.querySelector('.delta')?.getAttribute('aria-label')).toContain(label);
    }
    fixture.componentRef.setInput('change', null);
    fixture.detectChanges();
    expect(el.querySelector('.delta')).toBeNull();
  });

  it('scales sparklines to a shared maximum', () => {
    const fixture = TestBed.createComponent(SparklineComponent);
    fixture.componentRef.setInput('values', [0, 20]);
    fixture.componentRef.setInput('max', 40);
    fixture.detectChanges();
    const points = fixture.componentInstance.points();
    expect(points[1].y).toBeCloseTo(10);
    expect(fixture.nativeElement.querySelector('polyline')).not.toBeNull();
  });

  it('draws cumulative points with season dividers', () => {
    const entries: PointsChartEntry[] = [
      { raceId: 1, raceName: 'A', season: 2025, round: 1, points: 25 },
      { raceId: 2, raceName: 'B', season: 2026, round: 1, points: 18 },
    ];
    const fixture = TestBed.createComponent(PointsChartComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    const chart = fixture.componentInstance;

    expect(chart.dots().map((dot) => dot.total)).toEqual([25, 43]);
    expect(chart.seasons().map((s) => [s.season, s.x === null])).toEqual([
      [2025, true],
      [2026, false],
    ]);
    expect(chart.summary()).toContain('ending on 43 points');
    expect(chart.ticks().map((tick) => tick.value)).toEqual([0, 20, 40, 60]);
    expect(fixture.nativeElement.querySelectorAll('circle')).toHaveLength(2);
  });
});
