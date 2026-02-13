import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { adminGuard, authGuard, guestGuard } from './auth.guards';

function setupWithAuthState(isAuthenticated: boolean) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          isAuthenticated: () => isAuthenticated,
          ensureCurrentUser: () => of(null),
        },
      },
    ],
  });
}

function resolveGuardResult<T>(result: T | Observable<T> | Promise<T>): Promise<T> {
  if (result && typeof result === 'object' && 'subscribe' in result) {
    return firstValueFrom(result as Observable<T>);
  }
  if (result && typeof result === 'object' && 'then' in result) {
    return result as Promise<T>;
  }
  return Promise.resolve(result as T);
}

describe('Auth guards', () => {
  it('authGuard allows authenticated users', () => {
    setupWithAuthState(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/drivers' } as never)
    );

    expect(result).toBe(true);
  });

  it('authGuard redirects unauthenticated users to login', () => {
    setupWithAuthState(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/drivers' } as never)
    );

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toContain('/login');
    expect((result as UrlTree).toString()).toContain('next=%2Fdrivers');
  });

  it('guestGuard redirects authenticated users to home', () => {
    setupWithAuthState(true);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('adminGuard allows admin users', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            ensureCurrentUser: () => of({ is_staff: true, is_superuser: false }),
          },
        },
      ],
    });

    const guardResult = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/admin' } as never)
    );
    const result = await resolveGuardResult(guardResult);

    expect(result).toBe(true);
  });

  it('adminGuard redirects non-admin users to home', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            ensureCurrentUser: () => of({ is_staff: false, is_superuser: false }),
          },
        },
      ],
    });

    const guardResult = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/admin' } as never)
    );
    const result = await resolveGuardResult(guardResult);

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('adminGuard redirects unauthenticated users to login', () => {
    setupWithAuthState(false);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/admin' } as never)
    );

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toContain('/login');
    expect((result as UrlTree).toString()).toContain('next=%2Fadmin');
  });
});
