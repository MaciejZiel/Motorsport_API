import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Team } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-teams-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
})
export class TeamsPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.nameFilter = params.get('name') ?? '';
      this.countryFilter = params.get('country') ?? '';
      const page = this.parseOptionalPositiveInteger(params.get('page') ?? '') ?? 1;
      void this.reloadData(page);
    });
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
    void this.navigateWithQueryParams(1);
  }

  clearFilters(): void {
    this.nameFilter = '';
    this.countryFilter = '';
    void this.navigateWithQueryParams(1);
  }

  goToNextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }
    void this.navigateWithQueryParams(this.currentPage() + 1);
  }

  goToPreviousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }
    void this.navigateWithQueryParams(this.currentPage() - 1);
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

  private parseOptionalPositiveInteger(value: string): number | undefined {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return parsed;
  }

  private async navigateWithQueryParams(page: number): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildQueryParams(page),
    });
  }

  private buildQueryParams(page: number): Params {
    const queryParams: Params = {};
    const safePage = page > 0 ? page : 1;
    if (safePage > 1) {
      queryParams['page'] = safePage;
    }

    const name = this.nameFilter.trim();
    if (name) {
      queryParams['name'] = name;
    }

    const country = this.countryFilter.trim();
    if (country) {
      queryParams['country'] = country;
    }

    return queryParams;
  }
}
