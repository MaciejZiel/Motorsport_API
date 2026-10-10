import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { TeamDetail } from '../core/motorsport-api.types';
import { driverCode, teamColor } from '../core/team-identity';
import { reportUiError } from '../core/ui-error.utils';
import { LoadState, LoadStateComponent } from '../shared/load-state.component';

export interface TeamSeasonRecord {
  season: number;
  position: number | null;
  points: number;
  wins: number;
  teams: number;
}

@Component({
  selector: 'app-team-detail-page',
  imports: [RouterLink, LoadStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page" [style.--livery]="color()">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a routerLink="/teams">Teams</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{{ team()?.name ?? 'Team' }}</span>
      </nav>

      <app-load-state [state]="state()" subject="this team" [message]="errorMessage()" (retry)="load()" />

      @if (state() === 'ready' && team(); as t) {
        <header class="page-head livery">
          <div>
            <h1 class="page-title">{{ t.name }}</h1>
            <p class="page-lede">{{ t.country }}, {{ t.driver_count }} {{ t.driver_count === 1 ? 'driver' : 'drivers' }}</p>
          </div>
        </header>

        <div class="split">
          <section class="panel" aria-labelledby="roster-title">
            <div class="panel-head"><h2 id="roster-title">Drivers</h2></div>
            @if (roster().length) {
              <table class="data-table">
                <caption class="visually-hidden">{{ t.name }} drivers</caption>
                <thead>
                  <tr><th scope="col">Driver</th><th scope="col" class="r">Career pts</th></tr>
                </thead>
                <tbody>
                  @for (driver of roster(); track driver.id) {
                    <tr>
                      <td>
                        <a class="driver" [routerLink]="['/drivers', driver.id]">
                          <span class="code">{{ driver.code }}</span> {{ driver.name }}
                        </a>
                      </td>
                      <td class="r num strong">{{ driver.points }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="empty-line">No drivers assigned to this team.</p>
            }
          </section>

          <section class="panel" aria-labelledby="record-title">
            <div class="panel-head"><h2 id="record-title">Constructors' championship</h2></div>
            @if (record().length) {
              <table class="data-table">
                <caption class="visually-hidden">{{ t.name }} by season</caption>
                <thead>
                  <tr>
                    <th scope="col">Season</th>
                    <th scope="col" class="r">Pos</th>
                    <th scope="col" class="r">Wins</th>
                    <th scope="col" class="r">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of record(); track row.season) {
                    <tr>
                      <td><a class="num" routerLink="/" [queryParams]="{ season: row.season }">{{ row.season }}</a></td>
                      <td class="r num">
                        @if (row.position) {
                          P{{ row.position }} <span class="muted">of {{ row.teams }}</span>
                        } @else {
                          <span class="muted">Not classified</span>
                        }
                      </td>
                      <td class="r num">{{ row.wins }}</td>
                      <td class="r num strong">{{ row.points }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="empty-line">No seasons recorded yet.</p>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: `
    .livery { border-bottom: 4px solid var(--livery); }
    .split { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 20px; align-items: start; }
    .driver { display: inline-flex; align-items: center; gap: 10px; font-weight: 500; }
    .strong { font-weight: 600; }
  `,
})
export class TeamDetailPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly route = inject(ActivatedRoute);

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly team = signal<TeamDetail | null>(null);
  readonly record = signal<TeamSeasonRecord[]>([]);
  private teamId: number | null = null;

  readonly color = computed(() => teamColor(this.team()?.name));
  readonly roster = computed(() =>
    [...(this.team()?.drivers ?? [])]
      .sort((a, b) => b.points - a.points)
      .map((driver) => ({ ...driver, code: driverCode(driver.name) }))
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.teamId = null;
        this.errorMessage.set('That team link is broken. Pick a team from the list.');
        this.state.set('error');
        return;
      }
      this.teamId = id;
      this.load();
    });
  }

  load(): void {
    if (!this.teamId) {
      return;
    }
    const teamId = this.teamId;
    this.state.set('loading');
    this.errorMessage.set(null);

    forkJoin({
      team: this.api.getTeamById(teamId),
      record: this.api.getSeasons().pipe(
        switchMap((seasons) =>
          seasons.length
            ? forkJoin(
                seasons.map((season) =>
                  this.api.getConstructorStandings(season.year).pipe(
                    map((standings): TeamSeasonRecord => {
                      const index = standings.results.findIndex((row) => row.team_id === teamId);
                      const row = index >= 0 ? standings.results[index] : null;
                      return {
                        season: season.year,
                        position: row ? index + 1 : null,
                        points: row?.total_points ?? 0,
                        wins: row?.wins ?? 0,
                        teams: standings.results.length,
                      };
                    })
                  )
                )
              )
            : of([] as TeamSeasonRecord[])
        )
      ),
    }).subscribe({
      next: ({ team, record }) => {
        this.team.set(team);
        this.record.set([...record].sort((a, b) => b.season - a.season));
        this.state.set('ready');
      },
      error: (error: unknown) => {
        reportUiError(error);
        this.team.set(null);
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 404
            ? 'No team with this id exists.'
            : 'The API did not return this team. Try again in a moment.'
        );
        this.state.set('error');
      },
    });
  }
}
