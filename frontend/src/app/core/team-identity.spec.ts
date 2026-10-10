import { driverCode, teamColor } from './team-identity';

describe('team identity', () => {
  it('maps colour words in team names to liveries', () => {
    expect(teamColor('Red Apex')).toBe('#ff5257');
    expect(teamColor('Blue Arrow')).toBe('#4d90ff');
    expect(teamColor('Green Vertex')).toBe('#2fc47c');
    expect(teamColor('Silver Pulse')).toBe('#c5ced8');
  });

  it('gives other teams a stable fallback colour', () => {
    expect(teamColor('Scuderia Nova')).toBe(teamColor('Scuderia Nova'));
    expect(teamColor('Scuderia Nova')).toMatch(/^#[0-9a-f]{6}$/);
    expect(teamColor('')).toBe('#8a96a3');
    expect(teamColor(null)).toBe('#8a96a3');
  });

  it('builds three-letter driver codes from the surname', () => {
    expect(driverCode('Max Fast')).toBe('FAS');
    expect(driverCode('Carlos Drift')).toBe('DRI');
    expect(driverCode('Zé')).toBe('ZÉ-');
    expect(driverCode('')).toBe('---');
  });
});
