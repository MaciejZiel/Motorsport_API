import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { formatApiDate } from '../core/date-format.utils';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Race } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-race-detail-page',
  imports: [RouterLink],
  templateUrl: './race-detail-page.component.html',
  styleUrl: './race-detail-page.component.scss',
})
export class RaceDetailPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly route = inject(ActivatedRoute);
  readonly formatRaceDate = formatApiDate;

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly race = signal<Race | null>(null);
  readonly raceId = signal<number | null>(null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.raceId.set(null);
        this.race.set(null);
        this.state.set('error');
        this.errorMessage.set('Invalid race id in URL.');
        return;
      }

      this.raceId.set(id);
      void this.loadRace(id);
    });
  }

  retry(): void {
    const id = this.raceId();
    if (!id) {
      return;
    }
    void this.loadRace(id);
  }

  private async loadRace(id: number): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.api.getRaceById(id));
      this.race.set(response);
      this.state.set('ready');
    } catch (error) {
      console.error(error);
      this.race.set(null);
      this.errorMessage.set(this.resolveErrorMessage(error));
      this.state.set('error');
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'Race not found.';
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

    return 'Cannot load race details from API.';
  }
}
