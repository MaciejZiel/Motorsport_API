import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthService } from './auth.service';
import { authTokenInterceptor } from './auth.interceptor';

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

  it('does not add Authorization header for regular API requests', () => {
    http.get(`${API_BASE_URL}/drivers/`).subscribe();

    const request = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ count: 0, results: [] });
  });

  it('does not refresh token for auth endpoints', async () => {
    const responsePromise = firstValueFrom(
      http.post(`${API_BASE_URL}/auth/token/`, { username: 'admin', password: 'secret' })
    );

    const request = httpMock.expectOne(`${API_BASE_URL}/auth/token/`);
    request.flush({ detail: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone(`${API_BASE_URL}/auth/token/refresh/`);
    await expect(responsePromise).rejects.toBeInstanceOf(HttpErrorResponse);
  });

  it('refreshes token on 401 and retries original request once', async () => {
    const responsePromise = firstValueFrom(http.get<{ ok: boolean }>(`${API_BASE_URL}/drivers/`));

    const initialRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    initialRequest.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toEqual({});
    refreshRequest.flush({ access: 'fresh-access-token' });

    const retriedRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    retriedRequest.flush({ ok: true });

    await expect(responsePromise).resolves.toEqual({ ok: true });
  });

  it('reuses one refresh request for parallel 401 responses', async () => {
    const firstResponsePromise = firstValueFrom(http.get<{ ok: boolean }>(`${API_BASE_URL}/drivers/`));
    const secondResponsePromise = firstValueFrom(http.get<{ ok: boolean }>(`${API_BASE_URL}/teams/`));

    const firstInitialRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    const secondInitialRequest = httpMock.expectOne(`${API_BASE_URL}/teams/`);

    firstInitialRequest.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    secondInitialRequest.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    refreshRequest.flush({ access: 'fresh-access-token' });

    const firstRetriedRequest = httpMock.expectOne(`${API_BASE_URL}/drivers/`);
    const secondRetriedRequest = httpMock.expectOne(`${API_BASE_URL}/teams/`);

    firstRetriedRequest.flush({ ok: true });
    secondRetriedRequest.flush({ ok: true });

    await expect(firstResponsePromise).resolves.toEqual({ ok: true });
    await expect(secondResponsePromise).resolves.toEqual({ ok: true });
  });

  it('propagates original 401 when refresh request fails', async () => {
    const responsePromise = firstValueFrom(http.get(`${API_BASE_URL}/teams/`));

    const initialRequest = httpMock.expectOne(`${API_BASE_URL}/teams/`);
    initialRequest.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(`${API_BASE_URL}/auth/token/refresh/`);
    refreshRequest.flush({ detail: 'Refresh invalid' }, { status: 401, statusText: 'Unauthorized' });

    await expect(responsePromise).rejects.toBeInstanceOf(HttpErrorResponse);
  });
});

