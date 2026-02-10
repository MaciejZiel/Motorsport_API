import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Race } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-races-page',
  imports: [],
  templateUrl: './races-page.component.html',
  styleUrl: './races-page.component.scss',
})
export class RacesPageComponent {
  private readonly api = inject(MotorsportApiService);

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly races = signal<Race[]>([]);

  constructor() {
    void this.reloadData();
  }

  async reloadData(): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.api.getRaces());
      this.totalCount.set(response.count);
      this.races.set(response.results);
      this.state.set('ready');
    } catch (error) {
      console.error(error);
      this.totalCount.set(0);
      this.races.set([]);
      this.errorMessage.set('Cannot load races list from API.');
      this.state.set('error');
    }
  }
}
