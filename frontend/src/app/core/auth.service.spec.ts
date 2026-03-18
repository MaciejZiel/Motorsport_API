import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthService } from './auth.service';

const CURRENT_USER_KEY = 'motorsport_current_user';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    window.sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    window.sessionStorage.clear();
  });

  const flushCsrfRequest = (): void => {
    const csrfRequest = httpMock.expectOne(`${API_BASE_URL}/auth/csrf/`);
    expect(csrfRequest.request.method).toBe('GET');
    csrfRequest.flush({ csrfToken: 'csrf-token' });
  };

  it('posts credentials to login endpoint', () => {
    service.login('admin', 'testpass123').subscribe();

    flushCsrfRequest();
    const request = httpMock.expectOne(`${API_BASE_URL}/auth/login/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'admin', password: 'testpass123' });
    request.flush({
      user: { id: 1, username: 'admin', is_staff: true, is_superuser: true },
    });
  });

  it('stores current user profile after registration', async () => {
    const registerPromise = firstValueFrom(
      service.register('newfan', 'StrongPass123!', 'StrongPass123!')
    );

    flushCsrfRequest();
    const request = httpMock.expectOne(`${API_BASE_URL}/auth/register/`);
    expect(request.request.method).toBe('POST');
    request.flush({
      user: { id: 1, username: 'newfan', is_staff: false, is_superuser: false },
    });

    await expect(registerPromise).resolves.toEqual({
      id: 1,
      username: 'newfan',
      is_staff: false,
      is_superuser: false,
    });
    expect(service.getCurrentUser()).toEqual({
      id: 1,
      username: 'newfan',
      is_staff: false,
      is_superuser: false,
    });
    expect(window.sessionStorage.getItem(CURRENT_USER_KEY)).not.toBeNull();
    expect(service.isAuthenticated()).toBe(true);
  });

  it('returns cached current user without extra network call', async () => {
    service.register('newfan', 'StrongPass123!', 'StrongPass123!').subscribe();
    flushCsrfRequest();
    const registerRequest = httpMock.expectOne(`${API_BASE_URL}/auth/register/`);
    registerRequest.flush({
      user: { id: 1, username: 'newfan', is_staff: false, is_superuser: false },
    });

    await expect(firstValueFrom(service.ensureCurrentUser())).resolves.toEqual({
      id: 1,
      username: 'newfan',
      is_staff: false,
      is_superuser: false,
    });
    httpMock.expectNone(`${API_BASE_URL}/auth/me/`);
  });

  it('loads current user profile from backend when cache is empty', async () => {
    const profilePromise = firstValueFrom(service.ensureCurrentUser());

    const profileRequest = httpMock.expectOne(`${API_BASE_URL}/auth/me/`);
    expect(profileRequest.request.method).toBe('GET');
    profileRequest.flush({ id: 1, username: 'admin', is_staff: true, is_superuser: true });

    await expect(profilePromise).resolves.toEqual({
      id: 1,
      username: 'admin',
      is_staff: true,
      is_superuser: true,
    });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
  });

  it('refreshes access token using cookie-based refresh flow', async () => {
    const refreshPromise = firstValueFrom(service.refreshAccessToken());

    flushCsrfRequest();
    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/session/refresh/`);
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toEqual({});
    refreshRequest.flush({ detail: 'Session refreshed.' });

    await expect(refreshPromise).resolves.toBeUndefined();
  });

  it('deduplicates concurrent refresh calls into one request', async () => {
    const firstRefreshPromise = firstValueFrom(service.refreshAccessToken());
    const secondRefreshPromise = firstValueFrom(service.refreshAccessToken());

    flushCsrfRequest();
    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/session/refresh/`);
    refreshRequest.flush({ detail: 'Session refreshed.' });

    await expect(firstRefreshPromise).resolves.toBeUndefined();
    await expect(secondRefreshPromise).resolves.toBeUndefined();
  });

  it('clears local auth state when refresh fails', async () => {
    service.register('newfan', 'StrongPass123!', 'StrongPass123!').subscribe();
    flushCsrfRequest();
    const registerRequest = httpMock.expectOne(`${API_BASE_URL}/auth/register/`);
    registerRequest.flush({
      user: { id: 1, username: 'newfan', is_staff: false, is_superuser: false },
    });

    const refreshPromise = firstValueFrom(service.refreshAccessToken());
    flushCsrfRequest();
    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/session/refresh/`);
    refreshRequest.flush({ detail: 'Refresh invalid' }, { status: 401, statusText: 'Unauthorized' });

    await expect(refreshPromise).rejects.toBeTruthy();
    expect(service.getCurrentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(window.sessionStorage.getItem(CURRENT_USER_KEY)).toBeNull();
  });

  it('calls backend logout and clears local auth state', async () => {
    service.register('newfan', 'StrongPass123!', 'StrongPass123!').subscribe();
    flushCsrfRequest();
    const registerRequest = httpMock.expectOne(`${API_BASE_URL}/auth/register/`);
    registerRequest.flush({
      user: { id: 1, username: 'newfan', is_staff: false, is_superuser: false },
    });

    const logoutPromise = firstValueFrom(service.logout());

    flushCsrfRequest();
    const logoutRequest = httpMock.expectOne(`${API_BASE_URL}/auth/logout/`);
    expect(logoutRequest.request.method).toBe('POST');
    expect(logoutRequest.request.body).toEqual({});
    logoutRequest.flush(null, { status: 204, statusText: 'No Content' });

    await expect(logoutPromise).resolves.toBeUndefined();
    expect(service.getCurrentUser()).toBeNull();
    expect(window.sessionStorage.getItem(CURRENT_USER_KEY)).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
