import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiStats } from '../core/motorsport-api.types';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  const statsFixture: ApiStats = {
    total_teams: 2,
    total_drivers: 4,
    total_seasons: 1,
    total_races: 24,
    total_results: 480,
    top_points: 410,
  };

  const driverStandingsFixture = {
    season: 2026,
    results: [
      {
        driver_id: 1,
        driver_name: 'Max Fast',
        team_name: 'Red Apex',
        total_points: 410,
        wins: 12,
        podiums: 18,
      },
    ],
  };

  const constructorStandingsFixture = {
    season: 2026,
    results: [
      {
        team_id: 1,
        team_name: 'Red Apex',
        total_points: 650,
        wins: 14,
      },
    ],
  };

  let apiMock: {
    getStats: ReturnType<typeof vi.fn>;
    getDriverStandings: ReturnType<typeof vi.fn>;
    getConstructorStandings: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    apiMock = {
      getStats: vi.fn(),
      getDriverStandings: vi.fn(),
      getConstructorStandings: vi.fn(),
    };

    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [{ provide: MotorsportApiService, useValue: apiMock }],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets ready state when stats and standings load successfully', async () => {
    apiMock.getStats.mockReturnValue(of(statsFixture));
    apiMock.getDriverStandings.mockReturnValue(of(driverStandingsFixture));
    apiMock.getConstructorStandings.mockReturnValue(of(constructorStandingsFixture));

    const fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.whenStable();

    const component = fixture.componentInstance;

    expect(component.state()).toBe('ready');
    expect(component.errorMessage()).toBeNull();
    expect(component.warningMessage()).toBeNull();
    expect(component.season()).toBe(2026);
    expect(component.stats()).toEqual(statsFixture);
    expect(component.statCards()).toHaveLength(6);
    expect(component.driverStandings()).toHaveLength(1);
    expect(component.constructorStandings()).toHaveLength(1);
  });

  it('sets warning state when standings are partially unavailable', async () => {
    apiMock.getStats.mockReturnValue(of(statsFixture));
    apiMock.getDriverStandings.mockReturnValue(throwError(() => new Error('Driver standings unavailable')));
    apiMock.getConstructorStandings.mockReturnValue(of(constructorStandingsFixture));

    const fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.whenStable();

    const component = fixture.componentInstance;

    expect(component.state()).toBe('ready');
    expect(component.warningMessage()).toContain('standings are unavailable');
    expect(component.driverStandings()).toEqual([]);
    expect(component.constructorStandings()).toHaveLength(1);
    expect(component.season()).toBeNull();
  });

  it('sets error state when stats request fails', async () => {
    apiMock.getStats.mockReturnValue(throwError(() => new Error('Backend offline')));
    apiMock.getDriverStandings.mockReturnValue(of(driverStandingsFixture));
    apiMock.getConstructorStandings.mockReturnValue(of(constructorStandingsFixture));

    const fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.whenStable();

    const component = fixture.componentInstance;

    expect(component.state()).toBe('error');
    expect(component.errorMessage()).toContain('Cannot connect to backend API');
    expect(component.stats()).toBeNull();
    expect(component.driverStandings()).toEqual([]);
    expect(component.constructorStandings()).toEqual([]);
    expect(apiMock.getDriverStandings).not.toHaveBeenCalled();
    expect(apiMock.getConstructorStandings).not.toHaveBeenCalled();
  });
});
