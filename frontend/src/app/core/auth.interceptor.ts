import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthService } from './auth.service';

const RETRY_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const accessToken = auth.getAccessToken();
  const isTokenEndpoint = request.url === `${API_BASE_URL}/auth/token/`;
  const isRefreshEndpoint = request.url === `${API_BASE_URL}/auth/token/refresh/`;
  const isAuthEndpoint = isTokenEndpoint || isRefreshEndpoint;

  const requestWithAccess = accessToken && !isAuthEndpoint
    ? request.clone({
        setHeaders: { Authorization: `Bearer ${accessToken}` },
      })
    : request;

  return next(requestWithAccess).pipe(
    catchError((error: unknown) => {
      const shouldTryRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint &&
        !request.context.get(RETRY_AFTER_REFRESH) &&
        Boolean(auth.getRefreshToken());

      if (!shouldTryRefresh) {
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        catchError((refreshError) => {
          auth.clearTokens();
          return throwError(() => refreshError);
        }),
        switchMap((newAccessToken) =>
          next(
            request.clone({
              context: request.context.set(RETRY_AFTER_REFRESH, true),
              setHeaders: { Authorization: `Bearer ${newAccessToken}` },
            })
          )
        )
      );
    })
  );
};
