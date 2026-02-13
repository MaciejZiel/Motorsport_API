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

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildJwt(expiresInSeconds: number): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      sub: 'test-user',
    })
  );
  return `${header}.${payload}.signature`;
}

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    window.sessionStorage.clear();
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
    window.sessionStorage.clear();
  });

  it('adds Authorization header for regular API requests', () => {
    const accessToken = buildJwt(3600);
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    http.get(`${API_BASE_URL}/drivers/`).subscribe();

    const request = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
    request.flush({ count: 0, results: [] });
  });

  it('does not add Authorization header on auth endpoints', () => {
    const accessToken = buildJwt(3600);
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    http.post(`${API_BASE_URL}/auth/token/`, { username: 'admin', password: 'secret' }).subscribe();

    const request = httpMock.expectOne(`${API_BASE_URL}/auth/token/`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ access: buildJwt(3600), refresh: buildJwt(7200) });
  });

  it('does not attach expired access token', () => {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, buildJwt(-60));

    http.get(`${API_BASE_URL}/drivers/`).subscribe();

    const request = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ count: 0, results: [] });
  });

  it('refreshes token on 401 and retries original request once', async () => {
    const accessToken = buildJwt(3600);
    const refreshToken = buildJwt(7200);
    const freshAccessToken = buildJwt(3600);

    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    const responsePromise = firstValueFrom(http.get<{ ok: boolean }>(`${API_BASE_URL}/drivers/`));

    const initialRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    expect(initialRequest.request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
    initialRequest.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toEqual({ refresh: refreshToken });
    refreshRequest.flush({ access: freshAccessToken });

    const retriedRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    expect(retriedRequest.request.headers.get('Authorization')).toBe(`Bearer ${freshAccessToken}`);
    retriedRequest.flush({ ok: true });

    await expect(responsePromise).resolves.toEqual({ ok: true });
    expect(window.sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe(freshAccessToken);
  });

  it('reuses one refresh request for parallel 401 responses', async () => {
    const accessToken = buildJwt(3600);
    const refreshToken = buildJwt(7200);
    const freshAccessToken = buildJwt(3600);

    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    const firstResponsePromise = firstValueFrom(http.get<{ ok: boolean }>(`${API_BASE_URL}/drivers/`));
    const secondResponsePromise = firstValueFrom(http.get<{ ok: boolean }>(`${API_BASE_URL}/teams/`));

    const firstInitialRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    const secondInitialRequest = httpMock.expectOne(`${API_BASE_URL}/teams/`);

    firstInitialRequest.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });
    secondInitialRequest.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    refreshRequest.flush({ access: freshAccessToken });

    const firstRetriedRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    const secondRetriedRequest = httpMock.expectOne(`${API_BASE_URL}/teams/`);

    expect(firstRetriedRequest.request.headers.get('Authorization')).toBe(`Bearer ${freshAccessToken}`);
    expect(secondRetriedRequest.request.headers.get('Authorization')).toBe(`Bearer ${freshAccessToken}`);

    firstRetriedRequest.flush({ ok: true });
    secondRetriedRequest.flush({ ok: true });

    await expect(firstResponsePromise).resolves.toEqual({ ok: true });
    await expect(secondResponsePromise).resolves.toEqual({ ok: true });
  });

  it('clears tokens when refresh request fails', async () => {
    const accessToken = buildJwt(3600);
    const refreshToken = buildJwt(7200);

    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    const responsePromise = firstValueFrom(http.get(`${API_BASE_URL}/teams/`));

    const initialRequest = httpMock.expectOne(`${API_BASE_URL}/teams/`);
    initialRequest.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    refreshRequest.flush({ detail: 'Refresh invalid' }, { status: 401, statusText: 'Unauthorized' });

    await expect(responsePromise).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(window.sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });
});
