import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL, API_HEALTH_URL } from './api.config';
import { App } from './app';
import { AuthService } from './core/auth.service';

describe('App shell', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    window.sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => window.sessionStorage.clear());

  function flushBootRequests(): void {
    httpMock.expectOne(`${API_BASE_URL}/auth/csrf/`).flush({ csrfToken: 't' });
    httpMock.expectOne(`${API_BASE_URL}/auth/me/`).flush({}, { status: 403, statusText: 'Forbidden' });
  }

  it('renders the brand, navigation and a sign-in link for guests', async () => {
    const fixture = TestBed.createComponent(App);
    flushBootRequests();
    httpMock.expectOne(API_HEALTH_URL).flush({ status: 'ok' });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.brand-name')?.textContent).toContain('Pit Wall');
    const links = [...el.querySelectorAll('.nav a')].map((a) => a.textContent?.trim());
    expect(links).toEqual(['Standings', 'Calendar', 'Drivers', 'Teams']);
    expect(el.querySelector('.bar-right a.btn')?.textContent).toContain('Sign in');
    expect(fixture.componentInstance.apiStatus.status()).toBe('online');
    expect(fixture.componentInstance.statusLabel()).toMatch(/^API \d+ ms$/);
  });

  it('shows the signed-in user, their role and the admin link for staff', async () => {
    window.sessionStorage.setItem(
      'motorsport_current_user',
      JSON.stringify({ id: 1, username: 'staff', is_staff: true, is_superuser: false })
    );
    const fixture = TestBed.createComponent(App);
    httpMock.expectOne(`${API_BASE_URL}/auth/csrf/`).flush({ csrfToken: 't' });
    httpMock.expectOne(API_HEALTH_URL).flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.session')?.textContent).toContain('staff');
    expect(el.querySelector('.role')?.textContent).toContain('Staff');
    expect([...el.querySelectorAll('.nav a')].map((a) => a.textContent?.trim())).toContain('Admin');
    expect(fixture.componentInstance.statusLabel()).toBe('API offline');
  });

  it('labels read-only accounts and signs out', async () => {
    window.sessionStorage.setItem(
      'motorsport_current_user',
      JSON.stringify({ id: 2, username: 'demo', is_staff: false, is_superuser: false })
    );
    const fixture = TestBed.createComponent(App);
    httpMock.expectOne(`${API_BASE_URL}/auth/csrf/`).flush({ csrfToken: 't' });
    httpMock.expectOne(API_HEALTH_URL).flush({ status: 'ok' });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.role')?.textContent).toContain('Read-only');

    const signOut = fixture.componentInstance.signOut();
    httpMock.expectOne(`${API_BASE_URL}/auth/csrf/`).flush({ csrfToken: 't' });
    httpMock.expectOne(`${API_BASE_URL}/auth/logout/`).flush({});
    await signOut;
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
  });
});
