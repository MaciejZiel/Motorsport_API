import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { ConstructorStanding, Driver, Team } from '../core/motorsport-api.types';
import { driverCode, teamColor } from '../core/team-identity';
import { reportUiError } from '../core/ui-error.utils';
import { LoadState, LoadStateComponent } from '../shared/load-state.component';

@Component({
  selector: 'app-teams-page',
  imports: [RouterLink, LoadStateComponent],
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsPageComponent {
  private readonly api = inject(MotorsportApiService);

  readonly state = signal<LoadState>('loading');
  readonly teams = signal<Team[]>([]);
  readonly drivers = signal<Driver[]>([]);
  readonly standings = signal<ConstructorStanding[]>([]);
  readonly season = signal<number | null>(null);

  readonly garages = computed(() => {
    const standingByTeam = new Map(this.standings().map((row, index) => [row.team_id, { ...row, position: index + 1 }]));
    return this.teams()
      .map((team) => {
        const roster = this.drivers()
          .filter((driver) => driver.team.id === team.id)
          .sort((a, b) => b.points - a.points)
          .map((driver) => ({ ...driver, code: driverCode(driver.name) }));
        const standing = standingByTeam.get(team.id) ?? null;
        return {
          ...team,
          color: teamColor(team.name),
          roster,
          careerPoints: roster.reduce((sum, driver) => sum + driver.points, 0),
          standing,
        };
      })
      .sort(
        (a, b) =>
          (a.standing?.position ?? Infinity) - (b.standing?.position ?? Infinity) ||
          a.name.localeCompare(b.name)
      );
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    forkJoin({
      teams: this.api.getTeams(),
      drivers: this.api.getDrivers(),
      standings: this.api.getConstructorStandings(),
    }).subscribe({
        next: ({ teams, drivers, standings }) => {
          this.teams.set(teams);
          this.drivers.set(drivers);
          this.standings.set(standings.results);
          this.season.set(standings.season);
          this.state.set('ready');
        },
        error: (error: unknown) => {
          reportUiError(error);
          this.state.set('error');
        },
      });
  }
}
