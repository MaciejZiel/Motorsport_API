import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiMock, createApiMock } from '../testing/fixtures';
import { openPage, setupPage } from '../testing/harness';
import { DriversPageComponent } from './drivers-page.component';

describe('DriversPageComponent', () => {
  let api: ApiMock;

  beforeEach(() => {
    api = createApiMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setupPage(api, [{ path: 'drivers', component: DriversPageComponent }]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('ranks drivers by career points with bars relative to the top scorer', async () => {
    const { page, el } = await openPage('/drivers', DriversPageComponent);

    expect(page.rows().map((row) => [row.code, row.rank, row.ratio])).toEqual([
      ['FAS', 1, 1],
      ['PAC', 2, 58 / 86],
    ]);
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('shows empty and error states', async () => {
    api.getDrivers.mockReturnValue(of([]));
    const { page, el, harness } = await openPage('/drivers', DriversPageComponent);
    expect(el.textContent).toContain('No drivers yet');

    api.getDrivers.mockReturnValue(throwError(() => new Error('down')));
    page.load();
    harness.detectChanges();
    expect(page.state()).toBe('error');
  });
});
