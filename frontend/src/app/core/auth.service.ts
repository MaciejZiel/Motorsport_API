import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthUser, RegisterResponse, TokenPair } from './auth.types';

const ACCESS_TOKEN_KEY = 'motorsport_access_token';
const REFRESH_TOKEN_KEY = 'motorsport_refresh_token';
const CURRENT_USER_KEY = 'motorsport_current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private refreshInFlight$: Observable<string> | null = null;

  private readonly accessToken = signal<string | null>(this.readStorage(ACCESS_TOKEN_KEY));
  private readonly refreshToken = signal<string | null>(this.readStorage(REFRESH_TOKEN_KEY));
  private readonly currentUser = signal<AuthUser | null>(this.readUserStorage());

  readonly isAuthenticated = computed(
    () => this.isTokenUsable(this.accessToken()) || this.isTokenUsable(this.refreshToken())
  );
  readonly isAdmin = computed(
    () => Boolean(this.currentUser()?.is_staff || this.currentUser()?.is_superuser)
  );

  login(username: string, password: string): Observable<TokenPair> {
    return this.http.post<TokenPair>(`${API_BASE_URL}/auth/token/`, { username, password }).pipe(
      tap((tokens) => this.setTokens(tokens))
    );
  }

  register(username: string, password: string, passwordConfirm: string): Observable<TokenPair> {
    return this.http
      .post<RegisterResponse>(`${API_BASE_URL}/auth/register/`, {
        username,
        password,
        password_confirm: passwordConfirm,
      })
      .pipe(
        tap((response) => {
          this.setTokens(response);
          this.setCurrentUser(response.user);
        }),
        map((response) => ({
          access: response.access,
          refresh: response.refresh,
        }))
      );
  }

  refreshAccessToken(): Observable<string> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      return throwError(() => new Error('Missing refresh token'));
    }

    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http
      .post<{ access: string; refresh?: string }>(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
      .pipe(
        tap((tokens) =>
          this.setTokens({
            access: tokens.access,
            refresh: tokens.refresh ?? refresh,
          })
        ),
        map((tokens) => tokens.access),
        catchError((error) => {
          this.clearTokens();
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
    const refresh = this.readStorage(REFRESH_TOKEN_KEY);
    if (!refresh) {
      this.clearTokens();
      return of(void 0);
    }

    return this.http.post<void>(`${API_BASE_URL}/auth/logout/`, { refresh }).pipe(
      catchError(() => of(void 0)),
      tap(() => this.clearTokens()),
      map(() => void 0)
    );
  }

  ensureCurrentUser(): Observable<AuthUser | null> {
    const existingUser = this.currentUser();
    if (existingUser) {
      return of(existingUser);
    }

    if (!this.isAuthenticated()) {
      return of(null);
    }

    return this.http.get<AuthUser>(`${API_BASE_URL}/auth/me/`).pipe(
      tap((user) => this.setCurrentUser(user)),
      catchError(() => {
        this.clearTokens();
        return of(null);
      })
    );
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser();
  }

  getAccessToken(): string | null {
    return this.readValidToken(
      this.accessToken(),
      ACCESS_TOKEN_KEY,
      (value) => this.accessToken.set(value)
    );
  }

  getRefreshToken(): string | null {
    return this.readValidToken(
      this.refreshToken(),
      REFRESH_TOKEN_KEY,
      (value) => this.refreshToken.set(value)
    );
  }

  clearTokens(): void {
    this.setCurrentUser(null);
    this.setTokens({ access: '', refresh: '' });
  }

  private setTokens(tokens: TokenPair): void {
    const access = tokens.access || null;
    const refresh = tokens.refresh || null;
    this.accessToken.set(access);
    this.refreshToken.set(refresh);
    this.writeStorage(ACCESS_TOKEN_KEY, access);
    this.writeStorage(REFRESH_TOKEN_KEY, refresh);
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

  private readValidToken(
    token: string | null,
    key: string,
    updateToken: (value: string | null) => void
  ): string | null {
    if (!token) {
      return null;
    }

    if (!this.isTokenUsable(token)) {
      updateToken(null);
      this.writeStorage(key, null);
      return null;
    }

    return token;
  }

  private isTokenUsable(token: string | null): boolean {
    if (!token) {
      return false;
    }
    return !this.isTokenExpired(token);
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.parseTokenPayload(token);
    const expiresAt = payload?.['exp'];
    if (typeof expiresAt !== 'number') {
      return true;
    }

    const nowUnixSeconds = Math.floor(Date.now() / 1000);
    return expiresAt <= nowUnixSeconds + 5;
  }

  private parseTokenPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
      const decoded = atob(padded);
      const payload = JSON.parse(decoded);
      if (!payload || typeof payload !== 'object') {
        return null;
      }
      return payload as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
