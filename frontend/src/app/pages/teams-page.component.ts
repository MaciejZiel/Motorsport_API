import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Team } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-teams-page',
  imports: [],
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
})
export class TeamsPageComponent {
  private readonly api = inject(MotorsportApiService);

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly teams = signal<Team[]>([]);

  constructor() {
    void this.reloadData();
  }

  async reloadData(): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.api.getTeams());
      this.totalCount.set(response.count);
      this.teams.set(response.results);
      this.state.set('ready');
    } catch (error) {
      console.error(error);
      this.totalCount.set(0);
      this.teams.set([]);
      this.errorMessage.set('Cannot load teams list from API.');
      this.state.set('error');
    }
  }
}
