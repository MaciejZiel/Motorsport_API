import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, API_DOCS_URL } from './api.config';

interface ApiStats {
  total_teams: number;
  total_drivers: number;
  total_seasons: number;
  total_races: number;
  total_results: number;
  top_points: number;
}

interface DriverStanding {
  driver_id: number;
  driver_name: string;
  team_name: string;
  total_points: number;
  wins: number;
  podiums: number;
}

interface ConstructorStanding {
  team_id: number;
  team_name: string;
  total_points: number;
  wins: number;
}

interface SeasonStandingsResponse<T> {
  season: number;
  results: T[];
}

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly http = inject(HttpClient);

  readonly apiBaseUrl = API_BASE_URL;
  readonly docsUrl = API_DOCS_URL;

  readonly state = signal<LoadState>('loading');
  readonly warningMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly season = signal<number | null>(null);
  readonly stats = signal<ApiStats | null>(null);
  readonly driverStandings = signal<DriverStanding[]>([]);
  readonly constructorStandings = signal<ConstructorStanding[]>([]);

  readonly statCards = computed(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }

    return [
      { label: 'Teams', value: stats.total_teams, hint: 'Constructors' },
      { label: 'Drivers', value: stats.total_drivers, hint: 'Active records' },
      { label: 'Seasons', value: stats.total_seasons, hint: 'Tracked years' },
      { label: 'Races', value: stats.total_races, hint: 'Calendar entries' },
      { label: 'Results', value: stats.total_results, hint: 'Race results' },
      { label: 'Top points', value: stats.top_points, hint: 'Best driver total' },
    ];
  });

  constructor() {
    void this.reloadData();
  }

  async reloadData(): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set(null);
    this.warningMessage.set(null);

    try {
      const statsResponse = await firstValueFrom(this.http.get<ApiStats>(`${this.apiBaseUrl}/stats/`));
      this.stats.set(statsResponse);

      const [driversResponse, constructorsResponse] = await Promise.allSettled([
        firstValueFrom(
          this.http.get<SeasonStandingsResponse<DriverStanding>>(`${this.apiBaseUrl}/standings/drivers/`)
        ),
        firstValueFrom(
          this.http.get<SeasonStandingsResponse<ConstructorStanding>>(
            `${this.apiBaseUrl}/standings/constructors/`
          )
        ),
      ]);

      if (driversResponse.status === 'fulfilled') {
        this.driverStandings.set(driversResponse.value.results);
        this.season.set(driversResponse.value.season);
      } else {
        this.driverStandings.set([]);
        this.season.set(null);
      }

      if (constructorsResponse.status === 'fulfilled') {
        this.constructorStandings.set(constructorsResponse.value.results);
      } else {
        this.constructorStandings.set([]);
      }

      if (driversResponse.status === 'rejected' || constructorsResponse.status === 'rejected') {
        this.warningMessage.set(
          'Stats loaded, but standings are unavailable right now. Seed data with `python manage.py seed_motorsport`.'
        );
      }

      this.state.set('ready');
    } catch (error) {
      console.error(error);
      this.stats.set(null);
      this.driverStandings.set([]);
      this.constructorStandings.set([]);
      this.season.set(null);
      this.errorMessage.set(
        'Cannot connect to backend API. Start Django on http://127.0.0.1:8000 and refresh.'
      );
      this.state.set('error');
    }
  }
}
