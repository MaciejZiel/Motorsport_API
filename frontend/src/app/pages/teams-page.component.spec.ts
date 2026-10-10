import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiMock, createApiMock } from '../testing/fixtures';
import { openPage, setupPage } from '../testing/harness';
import { TeamDetailPageComponent } from './team-detail-page.component';
import { TeamsPageComponent } from './teams-page.component';

describe('Team pages', () => {
  let api: ApiMock;

  beforeEach(() => {
    api = createApiMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setupPage(api, [
      { path: 'teams', component: TeamsPageComponent },
      { path: 'teams/:id', component: TeamDetailPageComponent },
    ]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('lists teams in championship order with their line-ups', async () => {
    const { page, el } = await openPage('/teams', TeamsPageComponent);

    const garages = page.garages();
    expect(garages.map((team) => team.name)).toEqual(['Red Apex', 'Blue Arrow']);
    expect(garages[0].standing?.position).toBe(1);
    expect(garages[0].careerPoints).toBe(86);
    expect(el.querySelectorAll('.garage')).toHaveLength(2);
    expect(el.querySelector('.roster')?.textContent).toContain('FAS');
  });

  it('puts teams without points last and shows an empty state', async () => {
    api.getConstructorStandings.mockReturnValue(of({ season: 2026, results: [] }));
    const { page } = await openPage('/teams', TeamsPageComponent);
    expect(page.garages().every((team) => team.standing === null)).toBe(true);

    api.getTeams.mockReturnValue(of([]));
    page.load();
    expect(page.garages()).toEqual([]);
  });

  it('shows an error state when teams fail to load', async () => {
    api.getTeams.mockReturnValue(throwError(() => new Error('down')));
    const { page } = await openPage('/teams', TeamsPageComponent);
    expect(page.state()).toBe('error');
  });

  it('shows a team with its drivers and a record for every season', async () => {
    const { page, el } = await openPage('/teams/1', TeamDetailPageComponent);

    expect(el.querySelector('h1')?.textContent).toContain('Red Apex');
    expect(page.roster()[0].code).toBe('FAS');
    expect(page.record().map((row) => [row.season, row.position, row.points])).toEqual([
      [2026, 1, 43],
      [2025, 1, 43],
    ]);
  });

  it('marks seasons where the team scored nothing as not classified', async () => {
    api.getConstructorStandings.mockReturnValue(of({ season: 2025, results: [] }));
    const { page, el } = await openPage('/teams/1', TeamDetailPageComponent);

    expect(page.record()[0].position).toBeNull();
    expect(el.textContent).toContain('Not classified');
  });

  it('rejects a malformed team id', async () => {
    const { page } = await openPage('/teams/x', TeamDetailPageComponent);
    expect(page.state()).toBe('error');
    expect(api.getTeamById).not.toHaveBeenCalled();
  });
});
