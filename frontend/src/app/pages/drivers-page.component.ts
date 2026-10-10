import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Driver } from '../core/motorsport-api.types';
import { driverCode, teamColor } from '../core/team-identity';
import { reportUiError } from '../core/ui-error.utils';
import { LoadState, LoadStateComponent } from '../shared/load-state.component';

@Component({
  selector: 'app-drivers-page',
  imports: [RouterLink, LoadStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-title">Drivers</h1>
          <p class="page-lede">Career points across every season in the database.</p>
        </div>
      </header>

      <app-load-state [state]="state()" subject="drivers" (retry)="load()" />

      @if (state() === 'ready') {
        <section class="panel">
          @if (rows().length) {
            <div class="table-wrap">
              <table class="data-table">
                <caption class="visually-hidden">Drivers by career points</caption>
                <thead>
                  <tr>
                    <th scope="col" class="pos">#</th>
                    <th scope="col">Driver</th>
                    <th scope="col">Team</th>
                    <th scope="col" class="col-bar"><span class="visually-hidden">Points relative to the top scorer</span></th>
                    <th scope="col" class="r">Career pts</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of rows(); track row.id) {
                    <tr [style.--livery]="row.color">
                      <td class="pos">{{ row.rank }}</td>
                      <td>
                        <a class="driver" [routerLink]="['/drivers', row.id]">
                          <span class="code">{{ row.code }}</span>
                          {{ row.name }}
                        </a>
                      </td>
                      <td>
                        <a class="team-inline muted" [routerLink]="['/teams', row.team.id]">{{ row.team.name }}</a>
                      </td>
                      <td class="col-bar">
                        <span class="bar" [style.width.%]="row.ratio * 100"></span>
                      </td>
                      <td class="r num pts">{{ row.points }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="empty-line">No drivers yet. Staff can add them in the back-office.</p>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .driver { display: inline-flex; align-items: center; gap: 10px; font-weight: 500; }
    .pts { font-weight: 600; }
    .col-bar { width: 32%; }
    .bar { display: block; height: 4px; min-width: 2px; border-radius: 1px; background: var(--livery); }
    @media (max-width: 640px) { .col-bar { display: none; } }
  `,
})
export class DriversPageComponent {
  private readonly api = inject(MotorsportApiService);

  readonly state = signal<LoadState>('loading');
  readonly drivers = signal<Driver[]>([]);

  readonly rows = computed(() => {
    const sorted = [...this.drivers()].sort(
      (a, b) => b.points - a.points || a.name.localeCompare(b.name)
    );
    const top = Math.max(sorted[0]?.points ?? 0, 1);
    return sorted.map((driver, index) => ({
      ...driver,
      rank: index + 1,
      code: driverCode(driver.name),
      color: teamColor(driver.team.name),
      ratio: driver.points / top,
    }));
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.api.getDrivers().subscribe({
      next: (drivers) => {
        this.drivers.set(drivers);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        reportUiError(error);
        this.state.set('error');
      },
    });
  }
}
