import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard, guestGuard } from './auth.guards';

function setupWithAuthState(isAuthenticated: boolean) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          isAuthenticated: () => isAuthenticated,
        },
      },
    ],
  });
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
});
