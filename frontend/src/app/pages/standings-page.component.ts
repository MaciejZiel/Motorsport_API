import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import {
  SeasonProgression,
  buildSeasonProgression,
  classification,
  daysUntil,
  nextRace,
  positionChange,
} from '../core/championship';
import { formatApiDate } from '../core/date-format.utils';
import { MotorsportApiService } from '../core/motorsport-api.service';
import {
  ConstructorStanding,
  DriverStanding,
  Race,
  RaceResult,
  Season,
} from '../core/motorsport-api.types';
import { driverCode, teamColor } from '../core/team-identity';
import { reportUiError } from '../core/ui-error.utils';
import { LoadState, LoadStateComponent } from '../shared/load-state.component';
import { PositionChangeComponent } from '../shared/position-change.component';
import { SparklineComponent } from '../shared/sparkline.component';

interface SeasonBoard {
  season: Season | null;
  year: number | null;
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
  races: Race[];
  results: RaceResult[];
}

const EMPTY_BOARD: SeasonBoard = {
  season: null,
  year: null,
  drivers: [],
  constructors: [],
  races: [],
  results: [],
};

@Component({
  selector: 'app-standings-page',
  imports: [RouterLink, LoadStateComponent, PositionChangeComponent, SparklineComponent],
  templateUrl: './standings-page.component.html',
  styleUrl: './standings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StandingsPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly route = inject(ActivatedRoute);

  readonly formatDate = formatApiDate;
  readonly code = driverCode;
  readonly livery = teamColor;

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly seasons = signal<Season[]>([]);
  readonly board = signal<SeasonBoard>(EMPTY_BOARD);
  private readonly requestedYear = signal<number | null>(null);

  readonly year = computed(() => this.board().year);
  readonly progression = computed<SeasonProgression>(() =>
    buildSeasonProgression(this.board().races, this.board().results)
  );
  readonly roundsRun = computed(() => this.progression().rounds.length);
  readonly lastRace = computed(() => this.progression().rounds.at(-1) ?? null);
  readonly lastClassification = computed(() => {
    const race = this.lastRace();
    return race ? classification(this.board().results, race.id) : [];
  });
  readonly upcoming = computed(() => nextRace(this.board().races, this.board().results));
  readonly upcomingInDays = computed(() => {
    const race = this.upcoming();
    return race ? daysUntil(race.race_date) : null;
  });

  readonly tower = computed(() => {
    const drivers = this.board().drivers;
    const leaderPoints = drivers[0]?.total_points ?? 0;
    const byDriver = this.progression().byDriver;
    return drivers.map((row, index) => {
      const progression = byDriver.get(row.driver_id);
      return {
        ...row,
        position: index + 1,
        code: driverCode(row.driver_name),
        color: teamColor(row.team_name),
        gap: index === 0 ? null : leaderPoints - row.total_points,
        change: positionChange(progression),
        trace: progression?.cumulative ?? [row.total_points],
      };
    });
  });

  readonly constructorRows = computed(() => {
    const rows = this.board().constructors;
    const total = rows.reduce((sum, row) => sum + row.total_points, 0);
    return rows.map((row, index) => ({
      ...row,
      position: index + 1,
      color: teamColor(row.team_name),
      share: total ? row.total_points / total : 0,
    }));
  });

  readonly leaderPoints = computed(() => this.board().drivers[0]?.total_points ?? 0);

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => {
          const value = Number(params.get('season'));
          return Number.isInteger(value) && value > 0 ? value : null;
        }),
        takeUntilDestroyed()
      )
      .subscribe((year) => {
        this.requestedYear.set(year);
        this.load();
      });
  }

  load(): void {
    this.state.set('loading');
    this.errorMessage.set(null);

    const seasons$ = this.seasons().length ? of(this.seasons()) : this.api.getSeasons();
    seasons$
      .pipe(
        switchMap((seasons) => {
          this.seasons.set([...seasons].sort((a, b) => a.year - b.year));
          const season = this.pickSeason(seasons);
          if (!season) {
            return of(EMPTY_BOARD);
          }
          return forkJoin({
            drivers: this.api.getDriverStandings(season.year).pipe(map((r) => r.results)),
            constructors: this.api.getConstructorStandings(season.year).pipe(map((r) => r.results)),
            races: this.api.getRaces(season.year),
            results: this.api.getResults({ season: season.year }),
          }).pipe(map((data) => ({ ...data, season, year: season.year })));
        })
      )
      .subscribe({
        next: (board) => {
          this.board.set(board);
          this.state.set('ready');
        },
        error: (error: unknown) => {
          reportUiError(error);
          this.board.set(EMPTY_BOARD);
          this.errorMessage.set('The standings request failed. The API may be restarting.');
          this.state.set('error');
        },
      });
  }

  private pickSeason(seasons: Season[]): Season | null {
    if (!seasons.length) {
      return null;
    }
    const requested = this.requestedYear();
    const match = requested ? seasons.find((season) => season.year === requested) : undefined;
    return match ?? seasons.reduce((latest, season) => (season.year > latest.year ? season : latest));
  }
}
