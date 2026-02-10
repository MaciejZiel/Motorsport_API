import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, API_DOCS_URL } from '../api.config';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { ConstructorStanding, DriverStanding, ApiStats } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-dashboard-page',
  imports: [],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  private readonly api = inject(MotorsportApiService);

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
      const statsResponse = await firstValueFrom(this.api.getStats());
      this.stats.set(statsResponse);

      const [driversResponse, constructorsResponse] = await Promise.allSettled([
        firstValueFrom(this.api.getDriverStandings()),
        firstValueFrom(this.api.getConstructorStandings()),
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
