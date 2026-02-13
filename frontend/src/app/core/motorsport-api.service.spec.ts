import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api.config';
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

  it('builds drivers query params from filters', () => {
    service
      .getDrivers({
        page: 2,
        teamId: 4,
        country: 'Italy',
        minPoints: 100,
      })
      .subscribe((response) => {
        expect(response.count).toBe(1);
      });

    const request = httpMock.expectOne(`${API_BASE_URL}/drivers/?page=2&team=4&country=Italy&min_points=100`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('team')).toBe('4');
    expect(request.request.params.get('country')).toBe('Italy');
    expect(request.request.params.get('min_points')).toBe('100');

    request.flush({ count: 1, next: null, previous: null, results: [] });
  });

  it('omits invalid team filters', () => {
    service
      .getTeams({
        page: 0,
        name: '   ',
        country: '',
      })
      .subscribe((response) => {
        expect(response.count).toBe(0);
      });

    const request = httpMock.expectOne(`${API_BASE_URL}/teams/`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);

    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('builds races query params from filters', () => {
    service
      .getRaces({
        page: 3,
        season: 2026,
        country: 'Spain',
      })
      .subscribe((response) => {
        expect(response.count).toBe(2);
      });

    const request = httpMock.expectOne(`${API_BASE_URL}/races/?page=3&season=2026&country=Spain`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('season')).toBe('2026');
    expect(request.request.params.get('country')).toBe('Spain');

    request.flush({ count: 2, next: null, previous: null, results: [] });
  });
});
