import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthUser, RegisterResponse, TokenPair } from './auth.types';

const CURRENT_USER_KEY = 'motorsport_current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private refreshInFlight$: Observable<string> | null = null;
  private csrfInFlight$: Observable<void> | null = null;

  private readonly currentUser = signal<AuthUser | null>(this.readUserStorage());

  readonly isAuthenticated = computed(() => Boolean(this.currentUser()));
  readonly isAdmin = computed(
    () => Boolean(this.currentUser()?.is_staff || this.currentUser()?.is_superuser)
  );

  login(username: string, password: string): Observable<TokenPair> {
    return this.ensureCsrfToken().pipe(
      switchMap(() =>
        this.http.post<TokenPair>(`${API_BASE_URL}/auth/token/`, { username, password })
      )
    );
  }

  register(username: string, password: string, passwordConfirm: string): Observable<TokenPair> {
    return this.ensureCsrfToken().pipe(
      switchMap(() =>
        this.http.post<RegisterResponse>(`${API_BASE_URL}/auth/register/`, {
          username,
          password,
          password_confirm: passwordConfirm,
        })
      ),
      tap((response) => {
        this.setCurrentUser(response.user);
      }),
      map((response) => ({
        access: response.access,
        refresh: response.refresh,
      }))
    );
  }

  refreshAccessToken(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http
      .post<{ access: string }>(`${API_BASE_URL}/auth/token/refresh/`, {})
      .pipe(
        map((tokens) => tokens.access),
        catchError((error) => {
          this.clearAuthState();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.refreshInFlight$;
  }

  logout(): Observable<void> {
    return this.ensureCsrfToken().pipe(
      switchMap(() => this.http.post<void>(`${API_BASE_URL}/auth/logout/`, {})),
      catchError(() => of(void 0)),
      tap(() => this.clearAuthState()),
      map(() => void 0)
    );
  }

  ensureCsrfToken(): Observable<void> {
    if (this.csrfInFlight$) {
      return this.csrfInFlight$;
    }

    this.csrfInFlight$ = this.http.get<{ csrfToken: string }>(`${API_BASE_URL}/auth/csrf/`).pipe(
      map(() => void 0),
      catchError(() => of(void 0)),
      finalize(() => {
        this.csrfInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.csrfInFlight$;
  }

  ensureCurrentUser(): Observable<AuthUser | null> {
    const existingUser = this.currentUser();
    if (existingUser) {
      return of(existingUser);
    }

    return this.http.get<AuthUser>(`${API_BASE_URL}/auth/me/`).pipe(
      tap((user) => this.setCurrentUser(user)),
      catchError(() => {
        this.clearAuthState();
        return of(null);
      })
    );
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser();
  }

  clearTokens(): void {
    this.clearAuthState();
  }

  private clearAuthState(): void {
    this.setCurrentUser(null);
  }

  private setCurrentUser(user: AuthUser | null): void {
    this.currentUser.set(user);
    const serialized = user ? JSON.stringify(user) : null;
    this.writeStorage(CURRENT_USER_KEY, serialized);
  }

  private readStorage(key: string): string | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    return storage.getItem(key);
  }

  private writeStorage(key: string, value: string | null): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    if (value) {
      storage.setItem(key, value);
      return;
    }
    storage.removeItem(key);
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.sessionStorage;
  }

  private readUserStorage(): AuthUser | null {
    const raw = this.readStorage(CURRENT_USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      if (typeof parsed.id !== 'number' || typeof parsed.username !== 'string') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

}
