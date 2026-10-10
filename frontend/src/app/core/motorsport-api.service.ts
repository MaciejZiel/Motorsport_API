import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { API_BASE_URL, API_HEALTH_URL } from '../api.config';
import {
  ApiStats,
  ConstructorStanding,
  Driver,
  DriverStanding,
  HealthStatus,
  PaginatedResponse,
  Race,
  RaceCreatePayload,
  RaceResult,
  Season,
  SeasonStandingsResponse,
  Team,
  TeamDetail,
} from './motorsport-api.types';

type QueryValue = string | number | undefined | null;

export interface ResultFilters {
  season?: number;
  race?: number;
  driver?: number;
}

/** Safety net for runaway pagination; the API pages by 10. */
const MAX_PAGES = 50;

@Injectable({ providedIn: 'root' })
export class MotorsportApiService {
  private readonly http = inject(HttpClient);

  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(API_HEALTH_URL);
  }

  getStats(): Observable<ApiStats> {
    return this.http.get<ApiStats>(`${API_BASE_URL}/stats/`);
  }

  getDriverStandings(season?: number): Observable<SeasonStandingsResponse<DriverStanding>> {
    return this.http.get<SeasonStandingsResponse<DriverStanding>>(
      `${API_BASE_URL}/standings/drivers/`,
      { params: this.params({ season }) }
    );
  }

  getConstructorStandings(season?: number): Observable<SeasonStandingsResponse<ConstructorStanding>> {
    return this.http.get<SeasonStandingsResponse<ConstructorStanding>>(
      `${API_BASE_URL}/standings/constructors/`,
      { params: this.params({ season }) }
    );
  }

  getSeasons(): Observable<Season[]> {
    return this.getAll<Season>('seasons/');
  }

  getDrivers(): Observable<Driver[]> {
    return this.getAll<Driver>('drivers/');
  }

  getTeams(): Observable<Team[]> {
    return this.getAll<Team>('teams/');
  }

  getRaces(season?: number): Observable<Race[]> {
    return this.getAll<Race>('races/', { season });
  }

  getResults(filters: ResultFilters = {}): Observable<RaceResult[]> {
    return this.getAll<RaceResult>('results/', { ...filters });
  }

  getDriverById(id: number): Observable<Driver> {
    return this.http.get<Driver>(`${API_BASE_URL}/drivers/${id}/`);
  }

  getTeamById(id: number): Observable<TeamDetail> {
    return this.http.get<TeamDetail>(`${API_BASE_URL}/teams/${id}/`);
  }

  getRaceById(id: number): Observable<Race> {
    return this.http.get<Race>(`${API_BASE_URL}/races/${id}/`);
  }

  createRace(payload: RaceCreatePayload): Observable<Race> {
    return this.http.post<Race>(`${API_BASE_URL}/races/`, payload);
  }

  /**
   * Follows page numbers rather than the absolute `next` URLs, so paging keeps
   * working when the API sits behind a proxy on another host name.
   */
  private getAll<T>(path: string, query: Record<string, QueryValue> = {}): Observable<T[]> {
    const fetchPage = (page: number) =>
      this.http
        .get<PaginatedResponse<T>>(`${API_BASE_URL}/${path}`, {
          params: this.params({ ...query, page: page > 1 ? page : undefined }),
        })
        .pipe(map((response) => ({ page, response })));

    return fetchPage(1).pipe(
      expand(({ page, response }) =>
        response.next && page < MAX_PAGES ? fetchPage(page + 1) : EMPTY
      ),
      reduce((items, { response }) => items.concat(response.results), [] as T[])
    );
  }

  private params(query: Record<string, QueryValue>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value);
      }
    }
    return params;
  }
}
