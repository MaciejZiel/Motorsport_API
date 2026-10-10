import {
  buildSeasonProgression,
  classification,
  completedRounds,
  daysUntil,
  isUpcoming,
  nextRace,
  positionChange,
} from './championship';
import { Race, RaceResult } from './motorsport-api.types';

const race = (id: number, round: number, date: string, season = 2026): Race => ({
  id,
  name: `Race ${id}`,
  country: 'X',
  round_number: round,
  race_date: date,
  season_year: season,
});

const result = (id: number, r: Race, driverId: number, position: number, points: number): RaceResult => ({
  id,
  position,
  points_earned: points,
  fastest_lap: false,
  race: r,
  driver: { id: driverId, name: `Driver ${driverId}`, points: 0, team: { id: 1, name: 'Red Apex', country: 'Italy' } },
});

describe('championship', () => {
  const r1 = race(1, 1, '2026-03-15');
  const r2 = race(2, 2, '2026-04-19');
  const r3 = race(3, 3, '2026-11-01');
  const results = [
    result(1, r1, 10, 1, 25),
    result(2, r1, 20, 2, 18),
    result(3, r1, 30, 3, 15),
    result(4, r2, 30, 1, 25),
    result(5, r2, 20, 2, 18),
    result(6, r2, 10, 3, 15),
  ];

  it('replays cumulative points and positions round by round', () => {
    const progression = buildSeasonProgression([r3, r2, r1], results);

    expect(progression.rounds.map((r) => r.id)).toEqual([1, 2]);
    expect(progression.byDriver.get(10)?.cumulative).toEqual([25, 40]);
    expect(progression.byDriver.get(30)?.cumulative).toEqual([15, 40]);
    // 30 and 10 tie on points and wins, so the name decides: "Driver 10" first.
    expect(progression.byDriver.get(10)?.positions).toEqual([1, 1]);
    expect(progression.byDriver.get(30)?.positions).toEqual([3, 2]);
    expect(progression.byDriver.get(20)?.positions).toEqual([2, 3]);
  });

  it('reports places gained or lost in the last round', () => {
    const progression = buildSeasonProgression([r1, r2], results);

    expect(positionChange(progression.byDriver.get(30))).toBe(1);
    expect(positionChange(progression.byDriver.get(20))).toBe(-1);
    expect(positionChange(progression.byDriver.get(10))).toBe(0);
    expect(positionChange({ driverId: 1, cumulative: [10], positions: [1] })).toBeNull();
    expect(positionChange(undefined)).toBeNull();
  });

  it('finds the next race without results on or after today', () => {
    const today = new Date('2026-10-10T12:00:00Z');

    expect(nextRace([r1, r2, r3], results, today)?.id).toBe(3);
    expect(nextRace([r1, r2], results, today)).toBeNull();
    expect(isUpcoming(r3, today)).toBe(true);
    expect(isUpcoming(r1, today)).toBe(false);
    expect(daysUntil('2026-10-25', today)).toBe(15);
  });

  it('orders a classification and lists completed rounds', () => {
    expect(classification(results, 2).map((r) => r.position)).toEqual([1, 2, 3]);
    expect(completedRounds([r3, r1], results).map((r) => r.id)).toEqual([1]);
  });
});
