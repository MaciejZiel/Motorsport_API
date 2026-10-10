import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../core/auth.service';
import { createApiMock } from '../testing/fixtures';
import { openPage, setupPage } from '../testing/harness';
import { AdminPageComponent, backOfficeUrl } from './admin-page.component';
import { LoginPageComponent } from './login-page.component';
import { RegisterPageComponent } from './register-page.component';

const user = { id: 2, username: 'demo', is_staff: false, is_superuser: false };

describe('Sign-in pages', () => {
  let auth: { login: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { login: vi.fn(() => of(user)), register: vi.fn(() => of(user)) };
    setupPage(
      createApiMock(),
      [
        { path: 'login', component: LoginPageComponent },
        { path: 'register', component: RegisterPageComponent },
        { path: 'admin', component: AdminPageComponent },
        { path: '**', children: [] },
      ],
      [{ provide: AuthService, useValue: auth }]
    );
  });

  it('signs in as the read-only demo account with one click', async () => {
    const { page } = await openPage('/login?next=/races', LoginPageComponent);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    await page.continueAsDemo();

    expect(auth.login).toHaveBeenCalledWith('demo', 'motorsport-demo');
    expect(navigate).toHaveBeenCalledWith('/races');
  });

  it('validates the form and reports wrong credentials', async () => {
    const { page, el, harness } = await openPage('/login', LoginPageComponent);

    await page.submit();
    harness.detectChanges();
    expect(auth.login).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Enter your username.');

    auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    page.form.setValue({ username: 'someone', password: 'nope' });
    await page.submit();
    expect(page.errorMessage()).toBe('Wrong username or password.');
  });

  it('ignores off-site redirect targets', async () => {
    const { page } = await openPage('/login?next=//evil.example', LoginPageComponent);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    page.form.setValue({ username: 'demo', password: 'x' });
    await page.submit();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('explains demo, throttling and network failures', async () => {
    const { page } = await openPage('/login', LoginPageComponent);

    auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    await page.continueAsDemo();
    expect(page.errorMessage()).toContain('seed_demo_user');

    auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    await page.continueAsDemo();
    expect(page.errorMessage()).toContain('Too many');

    auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await page.continueAsDemo();
    expect(page.errorMessage()).toContain("Couldn't reach the API");
  });

  it('registers a new account and checks the passwords match', async () => {
    const { page } = await openPage('/register', RegisterPageComponent);

    page.form.setValue({ username: 'new', password: 'longenough', passwordConfirm: 'different' });
    await page.submit();
    expect(page.errorMessage()).toContain("don't match");
    expect(auth.register).not.toHaveBeenCalled();

    auth.register.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { errors: { username: ['Taken.'] } } }))
    );
    page.form.setValue({ username: 'new', password: 'longenough', passwordConfirm: 'longenough' });
    await page.submit();
    expect(page.errorMessage()).toBe('Taken.');

    auth.register.mockReturnValue(of(user));
    await page.submit();
    expect(auth.register).toHaveBeenLastCalledWith('new', 'longenough', 'longenough');
  });

  it('lists back-office sections for staff', async () => {
    const { page, el } = await openPage('/admin', AdminPageComponent);

    expect(page.sections).toHaveLength(6);
    expect(el.querySelectorAll('tbody tr')).toHaveLength(6);
    expect(backOfficeUrl('admin/', { protocol: 'http:', hostname: 'localhost', port: '4200' })).toBe(
      'http://localhost:8000/admin/'
    );
    expect(backOfficeUrl('/admin/', { protocol: 'https:', hostname: 'example.com', port: '' })).toBe('/admin/');
  });
});
