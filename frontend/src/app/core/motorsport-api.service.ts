import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  ApiStats,
  ConstructorStanding,
  Driver,
  DriverStanding,
  PaginatedResponse,
  Race,
  SeasonStandingsResponse,
  Team,
} from './motorsport-api.types';

@Injectable({ providedIn: 'root' })
export class MotorsportApiService {
  private readonly http = inject(HttpClient);

  getStats(): Observable<ApiStats> {
    return this.http.get<ApiStats>(`${API_BASE_URL}/stats/`);
  }

  getDriverStandings(season?: number): Observable<SeasonStandingsResponse<DriverStanding>> {
    return this.http.get<SeasonStandingsResponse<DriverStanding>>(`${API_BASE_URL}/standings/drivers/`, {
      params: this.buildSeasonParams(season),
    });
  }

  getConstructorStandings(season?: number): Observable<SeasonStandingsResponse<ConstructorStanding>> {
    return this.http.get<SeasonStandingsResponse<ConstructorStanding>>(
      `${API_BASE_URL}/standings/constructors/`,
      {
        params: this.buildSeasonParams(season),
      }
    );
  }

  getDrivers(): Observable<PaginatedResponse<Driver>> {
    return this.http.get<PaginatedResponse<Driver>>(`${API_BASE_URL}/drivers/`);
  }

  getTeams(): Observable<PaginatedResponse<Team>> {
    return this.http.get<PaginatedResponse<Team>>(`${API_BASE_URL}/teams/`);
  }

  getRaces(): Observable<PaginatedResponse<Race>> {
    return this.http.get<PaginatedResponse<Race>>(`${API_BASE_URL}/races/`);
  }

  private buildSeasonParams(season?: number): HttpParams {
    let params = new HttpParams();
    if (season) {
      params = params.set('season', season);
    }
    return params;
  }
}
