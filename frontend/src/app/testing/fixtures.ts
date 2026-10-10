import { of } from 'rxjs';
import { vi } from 'vitest';
import {
  ConstructorStanding,
  Driver,
  DriverStanding,
  Race,
  RaceResult,
  Season,
  Team,
} from '../core/motorsport-api.types';

export const seasons: Season[] = [
  { id: 1, year: 2025, name: 'Championship 2025', race_count: 1 },
  { id: 2, year: 2026, name: 'Championship 2026', race_count: 3 },
];

const team = (id: number, name: string, country: string) => ({ id, name, country });
export const redApex = team(1, 'Red Apex', 'Italy');
export const blueArrow = team(2, 'Blue Arrow', 'United Kingdom');

export const drivers: Driver[] = [
  { id: 1, name: 'Max Fast', points: 86, team: redApex },
  { id: 3, name: 'Owen Pace', points: 58, team: blueArrow },
];

export const teams: Team[] = [
  { ...redApex, driver_count: 1 },
  { ...blueArrow, driver_count: 1 },
];

export const races: Race[] = [
  { id: 1, name: 'Bahrain Grand Prix', country: 'Bahrain', round_number: 1, race_date: '2025-03-09', season_year: 2025 },
  { id: 3, name: 'Australian Grand Prix', country: 'Australia', round_number: 1, race_date: '2026-03-15', season_year: 2026 },
  { id: 4, name: 'Spanish Grand Prix', country: 'Spain', round_number: 2, race_date: '2026-04-19', season_year: 2026 },
  { id: 5, name: 'Japanese Grand Prix', country: 'Japan', round_number: 3, race_date: '2999-10-25', season_year: 2026 },
];

const result = (id: number, race: Race, driver: Driver, position: number, points: number, fastest = false): RaceResult => ({
  id,
  position,
  points_earned: points,
  fastest_lap: fastest,
  race,
  driver,
});

export const results2026: RaceResult[] = [
  result(1, races[1], drivers[1], 1, 25, true),
  result(2, races[1], drivers[0], 2, 18),
  result(3, races[2], drivers[0], 1, 25, true),
  result(4, races[2], drivers[1], 2, 18),
];

export const results2025: RaceResult[] = [result(5, races[0], drivers[0], 1, 25)];

export const driverStandings: DriverStanding[] = [
  { driver_id: 1, driver_name: 'Max Fast', team_name: 'Red Apex', total_points: 43, wins: 1, podiums: 2 },
  { driver_id: 3, driver_name: 'Owen Pace', team_name: 'Blue Arrow', total_points: 43, wins: 1, podiums: 2 },
];

export const constructorStandings: ConstructorStanding[] = [
  { team_id: 1, team_name: 'Red Apex', total_points: 43, wins: 1 },
  { team_id: 2, team_name: 'Blue Arrow', total_points: 43, wins: 1 },
];

export type ApiMock = Record<
  | 'getHealth'
  | 'getSeasons'
  | 'getDrivers'
  | 'getTeams'
  | 'getRaces'
  | 'getResults'
  | 'getDriverStandings'
  | 'getConstructorStandings'
  | 'getDriverById'
  | 'getTeamById'
  | 'getRaceById'
  | 'createRace',
  ReturnType<typeof vi.fn>
>;

/** An API mock that answers like the seeded demo database. */
export function createApiMock(): ApiMock {
  return {
    getHealth: vi.fn(() => of({ status: 'ok' })),
    getSeasons: vi.fn(() => of(seasons)),
    getDrivers: vi.fn(() => of(drivers)),
    getTeams: vi.fn(() => of(teams)),
    getRaces: vi.fn((season?: number) => of(season ? races.filter((r) => r.season_year === season) : races)),
    getResults: vi.fn((filters: { season?: number; race?: number; driver?: number } = {}) => {
      let rows = [...results2025, ...results2026];
      if (filters.season) rows = rows.filter((r) => r.race.season_year === filters.season);
      if (filters.race) rows = rows.filter((r) => r.race.id === filters.race);
      if (filters.driver) rows = rows.filter((r) => r.driver.id === filters.driver);
      return of(rows);
    }),
    getDriverStandings: vi.fn((season?: number) => of({ season: season ?? 2026, results: driverStandings })),
    getConstructorStandings: vi.fn((season?: number) => of({ season: season ?? 2026, results: constructorStandings })),
    getDriverById: vi.fn((id: number) => of(drivers.find((d) => d.id === id))),
    getTeamById: vi.fn(() => of({ ...redApex, driver_count: 1, drivers: [{ id: 1, name: 'Max Fast', points: 86 }] })),
    getRaceById: vi.fn((id: number) => of(races.find((r) => r.id === id))),
    createRace: vi.fn(),
  };
}
