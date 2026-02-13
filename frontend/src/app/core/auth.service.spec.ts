import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    window.localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('stores access and refresh token after login', () => {
    service.login('admin', 'testpass123').subscribe();

    const request = httpMock.expectOne(`${API_BASE_URL}/auth/token/`);
    expect(request.request.method).toBe('POST');
    request.flush({ access: 'access-1', refresh: 'refresh-1' });

    expect(service.getAccessToken()).toBe('access-1');
    expect(service.getRefreshToken()).toBe('refresh-1');
  });

  it('refreshes access token and keeps old refresh token if refresh response does not return new one', async () => {
    service.login('admin', 'testpass123').subscribe();
    const loginRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/`);
    loginRequest.flush({ access: 'access-old', refresh: 'refresh-old' });

    const nextAccessTokenPromise = firstValueFrom(service.refreshAccessToken());

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toEqual({ refresh: 'refresh-old' });
    refreshRequest.flush({ access: 'access-new' });

    const nextAccessToken = await nextAccessTokenPromise;

    expect(nextAccessToken).toBe('access-new');
    expect(service.getAccessToken()).toBe('access-new');
    expect(service.getRefreshToken()).toBe('refresh-old');
  });

  it('returns error when refresh token is missing', async () => {
    await expect(firstValueFrom(service.refreshAccessToken())).rejects.toThrow('Missing refresh token');
  });
});
