import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { ApiMock, createApiMock } from '../testing/fixtures';
import { StandingsPageComponent } from './standings-page.component';

describe('StandingsPageComponent', () => {
  let api: ApiMock;

  beforeEach(() => {
    api = createApiMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: StandingsPageComponent }]),
        { provide: MotorsportApiService, useValue: api },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  async function open(url = '/') {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, StandingsPageComponent);
    harness.detectChanges();
    return { harness, page, el: harness.routeNativeElement as HTMLElement };
  }

  it('shows the latest season with the timing tower, last race and next race', async () => {
    const { page, el } = await open();

    expect(page.state()).toBe('ready');
    expect(page.year()).toBe(2026);
    expect(api.getResults).toHaveBeenCalledWith({ season: 2026 });
    expect(el.querySelector('h1')?.textContent).toContain('2026 championship');

    const rows = el.querySelectorAll('.tower-table tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('FAS');
    expect(rows[0].textContent).toContain('Leader');
    expect(rows[1].textContent).toContain('Tied');

    // Max Fast was P2 after round 1 and leads after round 2.
    expect(page.tower()[0].change).toBe(1);
    expect(page.tower()[0].trace).toEqual([18, 43]);

    expect(page.lastRace()?.name).toBe('Spanish Grand Prix');
    expect(el.textContent).toContain('Japanese Grand Prix');
    expect(el.querySelectorAll('.share span')).toHaveLength(2);
  });

  it('loads the season picked in the query string', async () => {
    const { page } = await open('/?season=2025');

    expect(page.year()).toBe(2025);
    expect(api.getDriverStandings).toHaveBeenCalledWith(2025);
    expect(page.upcoming()).toBeNull();
  });

  it('shows an error with a retry button when the API fails', async () => {
    api.getDriverStandings.mockReturnValueOnce(throwError(() => new Error('offline')));
    const { page, harness, el } = await open();

    expect(page.state()).toBe('error');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load the standings");

    (el.querySelector('.retry') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(page.state()).toBe('ready');
  });

  it('explains when there are no seasons', async () => {
    api.getSeasons.mockReturnValue(of([]));
    const { el, page } = await open();

    expect(page.state()).toBe('ready');
    expect(el.textContent).toContain('No seasons yet');
  });
});
