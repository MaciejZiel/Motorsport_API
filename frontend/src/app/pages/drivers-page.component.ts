import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Driver } from '../core/motorsport-api.types';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-drivers-page',
  imports: [FormsModule],
  templateUrl: './drivers-page.component.html',
  styleUrl: './drivers-page.component.scss',
})
export class DriversPageComponent {
  private readonly api = inject(MotorsportApiService);
  private readonly pageSize = 10;

  readonly state = signal<LoadState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly drivers = signal<Driver[]>([]);
  readonly currentPage = signal(1);
  readonly hasNextPage = signal(false);
  readonly hasPreviousPage = signal(false);

  teamIdFilter = '';
  countryFilter = '';
  minPointsFilter = '';

  constructor() {
    void this.reloadData();
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
      this.errorMessage.set('Cannot load drivers list from API.');
      this.state.set('error');
    }
  }

  applyFilters(): void {
    void this.reloadData(1);
  }

  clearFilters(): void {
    this.teamIdFilter = '';
    this.countryFilter = '';
    this.minPointsFilter = '';
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

  private parseOptionalPositiveInteger(value: string, allowZero = false): number | undefined {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    if (!Number.isInteger(parsed)) {
      return undefined;
    }
    if (allowZero ? parsed < 0 : parsed <= 0) {
      return undefined;
    }
    return parsed;
  }
}
