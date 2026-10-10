import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { formatApiDate } from '../core/date-format.utils';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Driver, RaceResult } from '../core/motorsport-api.types';
import { driverCode, teamColor } from '../core/team-identity';
import { reportUiError } from '../core/ui-error.utils';
import { LoadState, LoadStateComponent } from '../shared/load-state.component';
import { PointsChartComponent, PointsChartEntry } from '../shared/points-chart.component';

interface SeasonSummary {
  season: number;
  starts: number;
  points: number;
  wins: number;
  best: number;
}

@Component({
  selector: 'app-driver-detail-page',
  imports: [RouterLink, LoadStateComponent, PointsChartComponent],
  templateUrl: './driver-detail-page.component.html',
  styleUrl: './driver-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverDetailPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly route = inject(ActivatedRoute);

  readonly formatDate = formatApiDate;

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly driver = signal<Driver | null>(null);
  readonly results = signal<RaceResult[]>([]);
  private driverId: number | null = null;

  readonly code = computed(() => driverCode(this.driver()?.name));
  readonly color = computed(() => teamColor(this.driver()?.team.name));

  readonly history = computed(() =>
    [...this.results()].sort(
      (a, b) =>
        a.race.season_year - b.race.season_year ||
        a.race.round_number - b.race.round_number
    )
  );

  readonly chartEntries = computed<PointsChartEntry[]>(() =>
    this.history().map((result) => ({
      raceId: result.race.id,
      raceName: result.race.name,
      season: result.race.season_year,
      round: result.race.round_number,
      points: result.points_earned,
    }))
  );

  readonly totals = computed(() => {
    const results = this.results();
    return {
      starts: results.length,
      wins: results.filter((r) => r.position === 1).length,
      podiums: results.filter((r) => r.position <= 3).length,
      fastestLaps: results.filter((r) => r.fastest_lap).length,
      best: results.length ? Math.min(...results.map((r) => r.position)) : null,
    };
  });

  readonly seasons = computed<SeasonSummary[]>(() => {
    const bySeason = new Map<number, SeasonSummary>();
    for (const result of this.history()) {
      const year = result.race.season_year;
      const summary = bySeason.get(year) ?? { season: year, starts: 0, points: 0, wins: 0, best: Infinity };
      summary.starts += 1;
      summary.points += result.points_earned;
      summary.wins += result.position === 1 ? 1 : 0;
      summary.best = Math.min(summary.best, result.position);
      bySeason.set(year, summary);
    }
    return [...bySeason.values()].sort((a, b) => b.season - a.season);
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.driverId = null;
        this.errorMessage.set('That driver link is broken. Pick a driver from the list.');
        this.state.set('error');
        return;
      }
      this.driverId = id;
      this.load();
    });
  }

  load(): void {
    if (!this.driverId) {
      return;
    }
    this.state.set('loading');
    this.errorMessage.set(null);

    forkJoin({
      driver: this.api.getDriverById(this.driverId),
      results: this.api.getResults({ driver: this.driverId }),
    }).subscribe({
      next: ({ driver, results }) => {
        this.driver.set(driver);
        this.results.set(results);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        reportUiError(error);
        this.driver.set(null);
        this.results.set([]);
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 404
            ? 'No driver with this id exists.'
            : 'The API did not return this driver. Try again in a moment.'
        );
        this.state.set('error');
      },
    });
  }
}
