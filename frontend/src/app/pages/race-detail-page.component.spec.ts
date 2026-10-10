import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiMock, createApiMock } from '../testing/fixtures';
import { openPage, setupPage } from '../testing/harness';
import { RaceDetailPageComponent } from './race-detail-page.component';

describe('RaceDetailPageComponent', () => {
  let api: ApiMock;

  beforeEach(() => {
    api = createApiMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setupPage(api, [{ path: 'races/:id', component: RaceDetailPageComponent }]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the podium, classification and neighbouring rounds', async () => {
    const { page, el } = await openPage('/races/4', RaceDetailPageComponent);

    expect(api.getResults).toHaveBeenCalledWith({ race: 4 });
    expect(api.getRaces).toHaveBeenCalledWith(2026);
    expect(el.querySelector('h1')?.textContent).toContain('Spanish Grand Prix');
    expect(el.querySelectorAll('.podium li')).toHaveLength(2);
    expect(el.querySelector('.podium li')?.textContent).toContain('FAS');
    expect(el.querySelector('.fastest-lap')).not.toBeNull();
    expect(page.neighbours().previous?.id).toBe(3);
    expect(page.neighbours().next?.id).toBe(5);
    expect(el.querySelector('.round-line')?.textContent).toContain('Round 2 of 3');
  });

  it('says an upcoming race has not been run', async () => {
    const { el } = await openPage('/races/5', RaceDetailPageComponent);

    expect(el.textContent).toContain('Not run yet');
  });

  it('reports a missing race', async () => {
    api.getRaceById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const { page } = await openPage('/races/99', RaceDetailPageComponent);

    expect(page.state()).toBe('error');
    expect(page.errorMessage()).toContain('No race with this id');
  });
});
