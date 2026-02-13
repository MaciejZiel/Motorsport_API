import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Team } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-teams-page',
  imports: [FormsModule],
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
})
export class TeamsPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly pageSize = 10;

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly teams = signal<Team[]>([]);
  readonly currentPage = signal(1);
  readonly hasNextPage = signal(false);
  readonly hasPreviousPage = signal(false);

  nameFilter = '';
  countryFilter = '';

  constructor() {
    void this.reloadData();
  }

  async reloadData(page: number = this.currentPage()): Promise<void> {
    const targetPage = page > 0 ? page : 1;
    this.state.set('loading');
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(
        this.api.getTeams({
          page: targetPage,
          name: this.nameFilter,
          country: this.countryFilter,
        })
      );
      this.totalCount.set(response.count);
      this.teams.set(response.results);
      this.currentPage.set(targetPage);
      this.hasNextPage.set(Boolean(response.next));
      this.hasPreviousPage.set(Boolean(response.previous));
      this.state.set('ready');
    } catch (error) {
      console.error(error);
      this.totalCount.set(0);
      this.teams.set([]);
      this.hasNextPage.set(false);
      this.hasPreviousPage.set(false);
      this.errorMessage.set(this.resolveErrorMessage(error));
      this.state.set('error');
    }
  }

  applyFilters(): void {
    void this.reloadData(1);
  }

  clearFilters(): void {
    this.nameFilter = '';
    this.countryFilter = '';
    void this.reloadData(1);
  }

  goToNextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }
    void this.reloadData(this.currentPage() + 1);
  }

  goToPreviousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }
    void this.reloadData(this.currentPage() - 1);
  }

  rowNumber(index: number): number {
    return (this.currentPage() - 1) * this.pageSize + index + 1;
  }

  hasActiveFilters(): boolean {
    return Boolean(this.nameFilter.trim() || this.countryFilter.trim());
  }

  emptyStateMessage(): string {
    if (this.hasActiveFilters()) {
      return 'No teams match current filters.';
    }
    return 'No teams available yet.';
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
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
    return 'Cannot load teams list from API.';
  }
}
