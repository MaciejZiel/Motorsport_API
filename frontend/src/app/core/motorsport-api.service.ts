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

export interface DriverListFilters {
  page?: number;
  teamId?: number;
  country?: string;
  minPoints?: number;
}

export interface TeamListFilters {
  page?: number;
  name?: string;
  country?: string;
}

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

  getDrivers(filters?: DriverListFilters): Observable<PaginatedResponse<Driver>> {
    let params = new HttpParams();

    if (filters?.page && filters.page > 0) {
      params = params.set('page', filters.page);
    }
    if (filters?.teamId && filters.teamId > 0) {
      params = params.set('team', filters.teamId);
    }
    if (filters?.country?.trim()) {
      params = params.set('country', filters.country.trim());
    }
    if (filters?.minPoints !== undefined && filters.minPoints >= 0) {
      params = params.set('min_points', filters.minPoints);
    }

    return this.http.get<PaginatedResponse<Driver>>(`${API_BASE_URL}/drivers/`, { params });
  }

  getTeams(filters?: TeamListFilters): Observable<PaginatedResponse<Team>> {
    let params = new HttpParams();

    if (filters?.page && filters.page > 0) {
      params = params.set('page', filters.page);
    }
    if (filters?.name?.trim()) {
      params = params.set('name', filters.name.trim());
    }
    if (filters?.country?.trim()) {
      params = params.set('country', filters.country.trim());
    }

    return this.http.get<PaginatedResponse<Team>>(`${API_BASE_URL}/teams/`, { params });
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
