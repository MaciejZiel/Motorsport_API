import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { createApiMock, ApiMock } from '../testing/fixtures';
import { openPage, setupPage } from '../testing/harness';
import { DriverDetailPageComponent } from './driver-detail-page.component';

describe('DriverDetailPageComponent', () => {
  let api: ApiMock;

  beforeEach(() => {
    api = createApiMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setupPage(api, [{ path: 'drivers/:id', component: DriverDetailPageComponent }]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the driver, career totals, the chart and every result in order', async () => {
    const { page, el } = await openPage('/drivers/1', DriverDetailPageComponent);

    expect(api.getResults).toHaveBeenCalledWith({ driver: 1 });
    expect(el.querySelector('h1')?.textContent).toContain('Max Fast');
    expect(el.querySelector('.big-code')?.textContent).toContain('FAS');
    expect(page.totals()).toEqual({ starts: 3, wins: 2, podiums: 3, fastestLaps: 1, best: 1 });
    expect(page.chartEntries().map((entry) => entry.points)).toEqual([25, 18, 25]);
    expect(page.seasons().map((s) => [s.season, s.points])).toEqual([
      [2026, 43],
      [2025, 25],
    ]);
    expect(el.querySelector('app-points-chart svg')).not.toBeNull();
    expect(el.querySelectorAll('.data-table tbody tr').length).toBe(2 + 3);
  });

  it('explains when the driver has no results', async () => {
    api.getResults.mockReturnValue(of([]));
    const { el } = await openPage('/drivers/1', DriverDetailPageComponent);

    expect(el.textContent).toContain('No race results yet');
    expect(el.querySelector('app-points-chart')).toBeNull();
  });

  it('reports a missing driver', async () => {
    api.getDriverById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const { page } = await openPage('/drivers/42', DriverDetailPageComponent);

    expect(page.state()).toBe('error');
    expect(page.errorMessage()).toContain('No driver with this id');
  });

  it('rejects a malformed id without calling the API', async () => {
    const { page } = await openPage('/drivers/abc', DriverDetailPageComponent);

    expect(page.state()).toBe('error');
    expect(api.getDriverById).not.toHaveBeenCalled();
  });
});
