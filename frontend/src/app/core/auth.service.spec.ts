import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthService } from './auth.service';

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

  it('stores access and refresh token after login', () => {
    const accessToken = buildJwt(3600);
    const refreshToken = buildJwt(7200);

    service.login('admin', 'testpass123').subscribe();

    const request = httpMock.expectOne(`${API_BASE_URL}/auth/token/`);
    expect(request.request.method).toBe('POST');
    request.flush({ access: accessToken, refresh: refreshToken });

    expect(service.getAccessToken()).toBe(accessToken);
    expect(service.getRefreshToken()).toBe(refreshToken);
    expect(window.sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe(accessToken);
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe(refreshToken);
  });

  it('refreshes access token and keeps old refresh token if refresh response does not return new one', async () => {
    const accessToken = buildJwt(3600);
    const refreshToken = buildJwt(7200);
    const refreshedAccessToken = buildJwt(3600);

    service.login('admin', 'testpass123').subscribe();
    const loginRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/`);
    loginRequest.flush({ access: accessToken, refresh: refreshToken });

    const nextAccessTokenPromise = firstValueFrom(service.refreshAccessToken());

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toEqual({ refresh: refreshToken });
    refreshRequest.flush({ access: refreshedAccessToken });

    const nextAccessToken = await nextAccessTokenPromise;

    expect(nextAccessToken).toBe(refreshedAccessToken);
    expect(service.getAccessToken()).toBe(refreshedAccessToken);
    expect(service.getRefreshToken()).toBe(refreshToken);
  });

  it('deduplicates concurrent refresh calls into one request', async () => {
    const accessToken = buildJwt(3600);
    const refreshToken = buildJwt(7200);
    const refreshedAccessToken = buildJwt(3600);

    service.login('admin', 'testpass123').subscribe();
    const loginRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/`);
    loginRequest.flush({ access: accessToken, refresh: refreshToken });

    const firstRefreshPromise = firstValueFrom(service.refreshAccessToken());
    const secondRefreshPromise = firstValueFrom(service.refreshAccessToken());

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    expect(refreshRequest.request.body).toEqual({ refresh: refreshToken });
    refreshRequest.flush({ access: refreshedAccessToken });

    await expect(firstRefreshPromise).resolves.toBe(refreshedAccessToken);
    await expect(secondRefreshPromise).resolves.toBe(refreshedAccessToken);
  });

  it('drops expired access token from storage', () => {
    const expiredAccessToken = buildJwt(-60);
    const validRefreshToken = buildJwt(7200);

    service.login('admin', 'testpass123').subscribe();
    const loginRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/`);
    loginRequest.flush({ access: expiredAccessToken, refresh: validRefreshToken });

    expect(service.getAccessToken()).toBeNull();
    expect(window.sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(service.isAuthenticated()).toBe(true);
  });

  it('returns error when refresh token is missing', async () => {
    await expect(firstValueFrom(service.refreshAccessToken())).rejects.toThrow('Missing refresh token');
  });
});
