import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { throwError, of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../core/auth.service';
import { ApiMock, createApiMock } from '../testing/fixtures';
import { openPage, setupPage } from '../testing/harness';
import { RacesPageComponent } from './races-page.component';

function signIn(isStaff: boolean): void {
  window.sessionStorage.setItem(
    'motorsport_current_user',
    JSON.stringify({ id: 7, username: isStaff ? 'staff' : 'demo', is_staff: isStaff, is_superuser: false })
  );
}

describe('RacesPageComponent', () => {
  let api: ApiMock;

  beforeEach(() => {
    window.sessionStorage.clear();
    api = createApiMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setupPage(api, [{ path: 'races', component: RacesPageComponent }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  function fill(page: RacesPageComponent): void {
    page.form.setValue({ name: 'Japanese Grand Prix', country: 'Japan', seasonId: 2, round: 3, date: '2026-10-25' });
  }

  it('groups the calendar by season with winners and upcoming rounds', async () => {
    const { page, el } = await openPage('/races', RacesPageComponent);

    expect(page.calendar().map((season) => season.year)).toEqual([2026, 2025]);
    const rounds2026 = page.calendar()[0].races;
    expect(rounds2026.map((race) => race.status)).toEqual(['finished', 'finished', 'upcoming']);
    expect(rounds2026[0].winner?.code).toBe('PAC');
    expect(el.querySelector('.tag.upcoming')?.textContent).toContain('Upcoming');
  });

  it('locks the add-race form for guests and points them to sign in', async () => {
    const { el } = await openPage('/races', RacesPageComponent);

    expect(el.querySelector('fieldset')?.disabled).toBe(true);
    expect(el.querySelector('.gate')?.textContent).toContain('Sign in with a staff account');
  });

  it('locks the form for read-only accounts and never calls the API', async () => {
    signIn(false);
    const { page, el } = await openPage('/races', RacesPageComponent);
    fill(page);
    page.addRace();

    expect(el.querySelector('fieldset')?.disabled).toBe(true);
    expect(el.querySelector('.gate')?.textContent).toContain('read-only account');
    expect(api.createRace).not.toHaveBeenCalled();
  });

  it('lets staff add a race', async () => {
    signIn(true);
    api.createRace.mockReturnValue(
      of({ id: 9, name: 'Japanese Grand Prix', country: 'Japan', round_number: 3, race_date: '2026-10-25', season_year: 2026 })
    );
    const { page, harness, el } = await openPage('/races', RacesPageComponent);
    fill(page);
    page.addRace();
    await harness.fixture.whenStable();

    expect(api.createRace).toHaveBeenCalledWith({
      name: 'Japanese Grand Prix',
      country: 'Japan',
      season_id: 2,
      round_number: 3,
      race_date: '2026-10-25',
    });
    expect(page.writeState()).toBe('saved');
    expect(el.querySelector('.notice.is-ok')?.textContent).toContain('Added the Japanese Grand Prix');
  });

  it('explains a 403 from the API instead of failing silently', async () => {
    signIn(true);
    api.createRace.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const { page } = await openPage('/races', RacesPageComponent);
    fill(page);
    page.addRace();

    expect(page.writeState()).toBe('error');
    expect(page.writeMessage()).toContain('403');
  });

  it('shows validation messages from the API', async () => {
    signIn(true);
    api.createRace.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: { non_field_errors: ['The fields season, round_number must make a unique set.'] } },
          })
      )
    );
    const { page } = await openPage('/races', RacesPageComponent);
    fill(page);
    page.addRace();

    expect(page.writeMessage()).toContain('must make a unique set');
  });

  it('does not submit an incomplete form', async () => {
    signIn(true);
    const { page } = await openPage('/races', RacesPageComponent);
    page.addRace();

    expect(api.createRace).not.toHaveBeenCalled();
    expect(page.form.touched).toBe(true);
    expect(TestBed.inject(AuthService).isAdmin()).toBe(true);
  });
});
