import { Race, RaceResult } from './motorsport-api.types';

export interface DriverProgression {
  driverId: number;
  /** Cumulative points after each completed round, in round order. */
  cumulative: number[];
  /** Championship position after each completed round. */
  positions: number[];
}

export interface SeasonProgression {
  /** Rounds that have at least one classified result, in calendar order. */
  rounds: Race[];
  byDriver: Map<number, DriverProgression>;
}

interface Tally {
  driverId: number;
  name: string;
  points: number;
  wins: number;
}

/** Same ordering as the API's standings: points, then wins, then name. */
function compareTallies(a: Tally, b: Tally): number {
  return b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name);
}

export function completedRounds(races: Race[], results: RaceResult[]): Race[] {
  const withResults = new Set(results.map((result) => result.race.id));
  return races
    .filter((race) => withResults.has(race.id))
    .sort((a, b) => a.season_year - b.season_year || a.round_number - b.round_number);
}

/** Replays a season round by round from its race results. */
export function buildSeasonProgression(races: Race[], results: RaceResult[]): SeasonProgression {
  const rounds = completedRounds(races, results);
  const tallies = new Map<number, Tally>();
  const byDriver = new Map<number, DriverProgression>();

  for (const result of results) {
    if (!tallies.has(result.driver.id)) {
      tallies.set(result.driver.id, {
        driverId: result.driver.id,
        name: result.driver.name,
        points: 0,
        wins: 0,
      });
      byDriver.set(result.driver.id, { driverId: result.driver.id, cumulative: [], positions: [] });
    }
  }

  for (const round of rounds) {
    for (const result of results) {
      if (result.race.id !== round.id) {
        continue;
      }
      const tally = tallies.get(result.driver.id)!;
      tally.points += result.points_earned;
      tally.wins += result.position === 1 ? 1 : 0;
    }
    const order = [...tallies.values()].sort(compareTallies);
    order.forEach((tally, index) => {
      const progression = byDriver.get(tally.driverId)!;
      progression.cumulative.push(tally.points);
      progression.positions.push(index + 1);
    });
  }

  return { rounds, byDriver };
}

/**
 * Places gained (positive) or lost (negative) in the last completed round, or
 * null when there is no earlier round to compare with.
 */
export function positionChange(progression: DriverProgression | undefined): number | null {
  const positions = progression?.positions ?? [];
  if (positions.length < 2) {
    return null;
  }
  return positions[positions.length - 2] - positions[positions.length - 1];
}

export function isUpcoming(race: Race, today: Date = new Date()): boolean {
  const todayIso = today.toISOString().slice(0, 10);
  return race.race_date >= todayIso;
}

/** Earliest race on or after today that has no results yet. */
export function nextRace(races: Race[], results: RaceResult[], today: Date = new Date()): Race | null {
  const withResults = new Set(results.map((result) => result.race.id));
  const upcoming = races
    .filter((race) => !withResults.has(race.id) && isUpcoming(race, today))
    .sort((a, b) => a.race_date.localeCompare(b.race_date));
  return upcoming[0] ?? null;
}

export function classification(results: RaceResult[], raceId: number): RaceResult[] {
  return results
    .filter((result) => result.race.id === raceId)
    .sort((a, b) => a.position - b.position);
}

/** Whole days from `today` (UTC) until an ISO date. */
export function daysUntil(isoDate: string, today: Date = new Date()): number {
  const target = Date.parse(`${isoDate}T00:00:00Z`);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((target - start) / 86_400_000);
}
