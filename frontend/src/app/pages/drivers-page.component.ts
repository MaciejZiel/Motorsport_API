import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Driver } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-drivers-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './drivers-page.component.html',
  styleUrl: './drivers-page.component.scss',
})
export class DriversPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pageSize = 10;

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly drivers = signal<Driver[]>([]);
  readonly currentPage = signal(1);
  readonly hasNextPage = signal(false);
  readonly hasPreviousPage = signal(false);

  teamIdFilter: string | number | null = '';
  countryFilter = '';
  minPointsFilter: string | number | null = '';

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.teamIdFilter = params.get('team') ?? '';
      this.countryFilter = params.get('country') ?? '';
      this.minPointsFilter = params.get('min_points') ?? '';
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
        this.api.getDrivers({
          page: targetPage,
          teamId: this.parseOptionalPositiveInteger(this.teamIdFilter),
          country: this.countryFilter,
          minPoints: this.parseOptionalPositiveInteger(this.minPointsFilter, true),
        })
      );
      this.totalCount.set(response.count);
      this.drivers.set(response.results);
      this.currentPage.set(targetPage);
      this.hasNextPage.set(Boolean(response.next));
      this.hasPreviousPage.set(Boolean(response.previous));
      this.state.set('ready');
    } catch (error) {
      console.error(error);
      this.totalCount.set(0);
      this.drivers.set([]);
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
    this.teamIdFilter = '';
    this.countryFilter = '';
    this.minPointsFilter = '';
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
    return Boolean(
      this.parseOptionalPositiveInteger(this.teamIdFilter) !== undefined ||
        this.countryFilter.trim() ||
        this.parseOptionalPositiveInteger(this.minPointsFilter, true) !== undefined
    );
  }

  emptyStateMessage(): string {
    if (this.hasActiveFilters()) {
      return 'No drivers match current filters.';
    }
    return 'No drivers available yet.';
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
    return 'Cannot load drivers list from API.';
  }

  private parseOptionalPositiveInteger(
    value: string | number | null | undefined,
    allowZero = false
  ): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const parsed = typeof value === 'number' ? value : Number(value.trim());
    if (!Number.isInteger(parsed)) {
      return undefined;
    }
    if (allowZero ? parsed < 0 : parsed <= 0) {
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

    const teamId = this.parseOptionalPositiveInteger(this.teamIdFilter);
    if (teamId !== undefined) {
      queryParams['team'] = teamId;
    }

    const country = this.countryFilter.trim();
    if (country) {
      queryParams['country'] = country;
    }

    const minPoints = this.parseOptionalPositiveInteger(this.minPointsFilter, true);
    if (minPoints !== undefined) {
      queryParams['min_points'] = minPoints;
    }

    return queryParams;
  }
}
