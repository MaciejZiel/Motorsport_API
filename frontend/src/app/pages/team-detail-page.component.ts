import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { TeamDetail } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-team-detail-page',
  imports: [RouterLink],
  templateUrl: './team-detail-page.component.html',
  styleUrl: './team-detail-page.component.scss',
})
export class TeamDetailPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly route = inject(ActivatedRoute);

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly team = signal<TeamDetail | null>(null);
  readonly teamId = signal<number | null>(null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        this.teamId.set(null);
        this.team.set(null);
        this.state.set('error');
        this.errorMessage.set('Invalid team id in URL.');
        return;
      }

      this.teamId.set(id);
      void this.loadTeam(id);
    });
  }

  retry(): void {
    const id = this.teamId();
    if (!id) {
      return;
    }
    void this.loadTeam(id);
  }

  private async loadTeam(id: number): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.api.getTeamById(id));
      this.team.set(response);
      this.state.set('ready');
    } catch (error) {
      console.error(error);
      this.team.set(null);
      this.errorMessage.set(this.resolveErrorMessage(error));
      this.state.set('error');
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'Team not found.';
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

    return 'Cannot load team details from API.';
  }
}
