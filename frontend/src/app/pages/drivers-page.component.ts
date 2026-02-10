import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Driver } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-drivers-page',
  imports: [],
  templateUrl: './drivers-page.component.html',
  styleUrl: './drivers-page.component.scss',
})
export class DriversPageComponent {
  private readonly api = inject(MotorsportApiService);

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly drivers = signal<Driver[]>([]);

  constructor() {
    void this.reloadData();
  }

  async reloadData(): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.api.getDrivers());
      this.totalCount.set(response.count);
      this.drivers.set(response.results);
      this.state.set('ready');
    } catch (error) {
      console.error(error);
      this.totalCount.set(0);
      this.drivers.set([]);
      this.errorMessage.set('Cannot load drivers list from API.');
      this.state.set('error');
    }
  }
}
