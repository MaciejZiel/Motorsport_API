export interface ApiStats {
  total_teams: number;
  total_drivers: number;
  total_seasons: number;
  total_races: number;
  total_results: number;
  top_points: number;
}

export interface TeamSlim {
  id: number;
  name: string;
  country: string;
}

export interface Team extends TeamSlim {
  driver_count?: number;
}

export interface TeamDriver {
  id: number;
  name: string;
  points: number;
}

export interface TeamDetail extends Team {
  driver_count: number;
  drivers: TeamDriver[];
}

export interface Driver {
  id: number;
  name: string;
  points: number;
  team: TeamSlim;
}

export interface Race {
  id: number;
  name: string;
  country: string;
  round_number: number;
  race_date: string;
  season_year: number;
}

export interface DriverStanding {
  driver_id: number;
  driver_name: string;
  team_name: string;
  total_points: number;
  wins: number;
  podiums: number;
}

export interface ConstructorStanding {
  team_id: number;
  team_name: string;
  total_points: number;
  wins: number;
}

export interface SeasonStandingsResponse<T> {
  season: number;
  results: T[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Season {
  id: number;
  year: number;
  name: string;
  race_count: number;
}

export interface RaceResult {
  id: number;
  position: number;
  points_earned: number;
  fastest_lap: boolean;
  race: Race;
  driver: Driver;
}

export interface RaceCreatePayload {
  name: string;
  country: string;
  round_number: number;
  race_date: string;
  season_id: number;
}

export interface HealthStatus {
  status: string;
  service?: string;
  database?: boolean;
}
