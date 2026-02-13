import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthService } from './auth.service';
import { authTokenInterceptor } from './auth.interceptor';

const ACCESS_TOKEN_KEY = 'motorsport_access_token';
const REFRESH_TOKEN_KEY = 'motorsport_refresh_token';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        AuthService,
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('adds Authorization header for regular API requests', () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'access-1');

    http.get(`${API_BASE_URL}/drivers/`).subscribe();

    const request = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
    request.flush({ count: 0, results: [] });
  });

  it('does not add Authorization header on auth endpoints', () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'access-1');

    http.post(`${API_BASE_URL}/auth/token/`, { username: 'admin', password: 'secret' }).subscribe();

    const request = httpMock.expectOne(`${API_BASE_URL}/auth/token/`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ access: 'new-access', refresh: 'new-refresh' });
  });

  it('refreshes token on 401 and retries original request once', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'expired-access');
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1');

    const responsePromise = firstValueFrom(http.get<{ ok: boolean }>(`${API_BASE_URL}/drivers/`));

    const initialRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    expect(initialRequest.request.headers.get('Authorization')).toBe('Bearer expired-access');
    initialRequest.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toEqual({ refresh: 'refresh-1' });
    refreshRequest.flush({ access: 'fresh-access' });

    const retriedRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    expect(retriedRequest.request.headers.get('Authorization')).toBe('Bearer fresh-access');
    retriedRequest.flush({ ok: true });

    await expect(responsePromise).resolves.toEqual({ ok: true });
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('fresh-access');
  });

  it('clears tokens when refresh request fails', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'expired-access');
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1');

    const responsePromise = firstValueFrom(http.get(`${API_BASE_URL}/teams/`));

    const initialRequest = httpMock.expectOne(`${API_BASE_URL}/teams/`);
    initialRequest.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    refreshRequest.flush({ detail: 'Refresh invalid' }, { status: 401, statusText: 'Unauthorized' });

    await expect(responsePromise).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });
});
