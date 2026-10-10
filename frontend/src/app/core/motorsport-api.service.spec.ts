import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, API_HEALTH_URL } from '../api.config';
import { MotorsportApiService } from './motorsport-api.service';

describe('MotorsportApiService', () => {
  let service: MotorsportApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MotorsportApiService],
    });

    service = TestBed.inject(MotorsportApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls stats endpoint', () => {
    service.getStats().subscribe((response) => {
      expect(response.total_teams).toBe(2);
      expect(response.total_drivers).toBe(6);
    });

    const request = httpMock.expectOne(`${API_BASE_URL}/stats/`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);

    request.flush({
      total_teams: 2,
      total_drivers: 6,
      total_seasons: 1,
      total_races: 24,
      total_results: 480,
      top_points: 410,
    });
  });

  it('passes season param to driver standings endpoint', () => {
    service.getDriverStandings(2026).subscribe((response) => {
      expect(response.season).toBe(2026);
      expect(response.results).toHaveLength(0);
    });

    const request = httpMock.expectOne(`${API_BASE_URL}/standings/drivers/?season=2026`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('season')).toBe('2026');

    request.flush({ season: 2026, results: [] });
  });

  it('does not send season param for constructor standings when not provided', () => {
    service.getConstructorStandings().subscribe((response) => {
      expect(response.results).toHaveLength(0);
    });

    const request = httpMock.expectOne(`${API_BASE_URL}/standings/constructors/`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);

    request.flush({ season: 2026, results: [] });
  });

  it('follows page numbers until the last page of drivers', () => {
    let drivers: unknown[] = [];
    service.getDrivers().subscribe((response) => (drivers = response));

    const first = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    first.flush({
      count: 2,
      next: 'http://internal-host/api/v1/drivers/?page=2',
      previous: null,
      results: [{ id: 1, name: 'Max Fast', points: 86, team: { id: 1, name: 'Red Apex', country: 'Italy' } }],
    });

    const second = httpMock.expectOne(`${API_BASE_URL}/drivers/?page=2`);
    second.flush({
      count: 2,
      next: null,
      previous: `${API_BASE_URL}/drivers/`,
      results: [{ id: 2, name: 'Luca Stone', points: 27, team: { id: 1, name: 'Red Apex', country: 'Italy' } }],
    });

    expect(drivers).toHaveLength(2);
  });

  it('passes result filters and skips empty ones', () => {
    service.getResults({ season: 2026, driver: undefined, race: 4 }).subscribe();

    const request = httpMock.expectOne(
      (req) => req.url === `${API_BASE_URL}/results/` && req.params.get('season') === '2026'
    );
    expect(request.request.params.get('race')).toBe('4');
    expect(request.request.params.has('driver')).toBe(false);
    expect(request.request.params.has('page')).toBe(false);
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('filters races by season', () => {
    service.getRaces(2025).subscribe((races) => expect(races).toEqual([]));

    const request = httpMock.expectOne(`${API_BASE_URL}/races/?season=2025`);
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('lists seasons and teams', () => {
    service.getSeasons().subscribe((seasons) => expect(seasons).toHaveLength(1));
    service.getTeams().subscribe((teams) => expect(teams).toHaveLength(0));

    httpMock
      .expectOne(`${API_BASE_URL}/seasons/`)
      .flush({ count: 1, next: null, previous: null, results: [{ id: 1, year: 2026, name: 'S', race_count: 2 }] });
    httpMock.expectOne(`${API_BASE_URL}/teams/`).flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('posts a new race', () => {
    const payload = { name: 'Japanese Grand Prix', country: 'Japan', round_number: 3, race_date: '2026-10-25', season_id: 2 };
    service.createRace(payload).subscribe((race) => expect(race.id).toBe(9));

    const request = httpMock.expectOne(`${API_BASE_URL}/races/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ id: 9, name: 'Japanese Grand Prix', country: 'Japan', round_number: 3, race_date: '2026-10-25', season_year: 2026 });
  });

  it('checks API health', () => {
    service.getHealth().subscribe((health) => expect(health.status).toBe('ok'));
    httpMock.expectOne(API_HEALTH_URL).flush({ status: 'ok', database: true });
  });

  it('calls driver detail endpoint', () => {
    service.getDriverById(12).subscribe((response) => {
      expect(response.id).toBe(12);
      expect(response.name).toBe('Max Fast');
    });

    const request = httpMock.expectOne(`${API_BASE_URL}/drivers/12/`);
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 12,
      name: 'Max Fast',
      points: 410,
      team: { id: 1, name: 'Red Apex', country: 'Italy' },
    });
  });

  it('calls team detail endpoint', () => {
    service.getTeamById(3).subscribe((response) => {
      expect(response.id).toBe(3);
      expect(response.drivers).toHaveLength(1);
    });

    const request = httpMock.expectOne(`${API_BASE_URL}/teams/3/`);
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 3,
      name: 'Blue Arrow',
      country: 'UK',
      driver_count: 1,
      drivers: [{ id: 7, name: 'Owen Pace', points: 250 }],
    });
  });

  it('calls race detail endpoint', () => {
    service.getRaceById(9).subscribe((response) => {
      expect(response.id).toBe(9);
      expect(response.round_number).toBe(2);
    });

    const request = httpMock.expectOne(`${API_BASE_URL}/races/9/`);
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 9,
      name: 'Spanish Grand Prix',
      country: 'Spain',
      round_number: 2,
      race_date: '2026-04-19',
      season_year: 2026,
    });
  });
});
