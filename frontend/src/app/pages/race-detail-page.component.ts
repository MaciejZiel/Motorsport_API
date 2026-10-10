import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, map, switchMap } from 'rxjs';
import { isUpcoming } from '../core/championship';
import { formatApiDate } from '../core/date-format.utils';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Race, RaceResult } from '../core/motorsport-api.types';
import { driverCode, teamColor } from '../core/team-identity';
import { reportUiError } from '../core/ui-error.utils';
import { LoadState, LoadStateComponent } from '../shared/load-state.component';

@Component({
  selector: 'app-race-detail-page',
  imports: [RouterLink, LoadStateComponent],
  templateUrl: './race-detail-page.component.html',
  styleUrl: './race-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceDetailPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly route = inject(ActivatedRoute);

  readonly formatDate = formatApiDate;

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly race = signal<Race | null>(null);
  readonly seasonRaces = signal<Race[]>([]);
  readonly results = signal<RaceResult[]>([]);
  private raceId: number | null = null;

  readonly rows = computed(() =>
    [...this.results()]
      .sort((a, b) => a.position - b.position)
      .map((result) => ({
        ...result,
        code: driverCode(result.driver.name),
        color: teamColor(result.driver.team.name),
      }))
  );
  readonly podium = computed(() => this.rows().slice(0, 3));
  readonly upcoming = computed(() => {
    const race = this.race();
    return race ? isUpcoming(race) : false;
  });

  readonly neighbours = computed(() => {
    const race = this.race();
    const ordered = [...this.seasonRaces()].sort((a, b) => a.round_number - b.round_number);
    const index = race ? ordered.findIndex((item) => item.id === race.id) : -1;
    return {
      previous: index > 0 ? ordered[index - 1] : null,
      next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null,
      total: ordered.length,
    };
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.raceId = null;
        this.errorMessage.set('That race link is broken. Pick a race from the calendar.');
        this.state.set('error');
        return;
      }
      this.raceId = id;
      this.load();
    });
  }

  load(): void {
    if (!this.raceId) {
      return;
    }
    const raceId = this.raceId;
    this.state.set('loading');
    this.errorMessage.set(null);

    this.api
      .getRaceById(raceId)
      .pipe(
        switchMap((race) =>
          forkJoin({
            results: this.api.getResults({ race: raceId }),
            seasonRaces: this.api.getRaces(race.season_year),
          }).pipe(map((data) => ({ race, ...data })))
        )
      )
      .subscribe({
        next: ({ race, results, seasonRaces }) => {
          this.race.set(race);
          this.results.set(results);
          this.seasonRaces.set(seasonRaces);
          this.state.set('ready');
        },
        error: (error: unknown) => {
          reportUiError(error);
          this.race.set(null);
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 404
              ? 'No race with this id exists.'
              : 'The API did not return this race. Try again in a moment.'
          );
          this.state.set('error');
        },
      });
  }
}
