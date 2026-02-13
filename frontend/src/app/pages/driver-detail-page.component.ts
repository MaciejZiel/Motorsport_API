import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Driver } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-driver-detail-page',
  imports: [RouterLink],
  templateUrl: './driver-detail-page.component.html',
  styleUrl: './driver-detail-page.component.scss',
})
export class DriverDetailPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly route = inject(ActivatedRoute);

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly driver = signal<Driver | null>(null);
  readonly driverId = signal<number | null>(null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.driverId.set(null);
        this.driver.set(null);
        this.state.set('error');
        this.errorMessage.set('Invalid driver id in URL.');
        return;
      }

      this.driverId.set(id);
      void this.loadDriver(id);
    });
  }

  retry(): void {
    const id = this.driverId();
    if (!id) {
      return;
    }
    void this.loadDriver(id);
  }

  private async loadDriver(id: number): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.api.getDriverById(id));
      this.driver.set(response);
      this.state.set('ready');
    } catch (error) {
      console.error(error);
      this.driver.set(null);
      this.errorMessage.set(this.resolveErrorMessage(error));
      this.state.set('error');
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'Driver not found.';
      }
      if (error.status === 0) {
        return 'Cannot connect to backend API.';
      }

      const payload = error.error;
      if (payload && typeof payload === 'object' && 'detail' in payload) {
        const detail = String((payload as { detail: unknown }).detail ?? '').trim();
        if (detail) {
          return detail;
        }
      }
    }

    return 'Cannot load driver details from API.';
  }
}
