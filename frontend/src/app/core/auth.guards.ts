import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return auth.ensureCurrentUser().pipe(
    map((user) =>
      user ? true : router.createUrlTree(['/login'], { queryParams: { next: state.url } })
    )
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/']);
  }

  return auth.ensureCurrentUser().pipe(map((user) => (user ? router.createUrlTree(['/']) : true)));
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureCurrentUser().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
      }
      if (user?.is_staff || user?.is_superuser) {
        return true;
      }
      return router.createUrlTree(['/']);
    })
  );
};
