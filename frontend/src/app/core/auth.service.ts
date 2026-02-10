import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { TokenPair } from './auth.types';

const ACCESS_TOKEN_KEY = 'motorsport_access_token';
const REFRESH_TOKEN_KEY = 'motorsport_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly accessToken = signal<string | null>(this.readStorage(ACCESS_TOKEN_KEY));
  private readonly refreshToken = signal<string | null>(this.readStorage(REFRESH_TOKEN_KEY));

  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));

  login(username: string, password: string): Observable<TokenPair> {
    return this.http.post<TokenPair>(`${API_BASE_URL}/auth/token/`, { username, password }).pipe(
      tap((tokens) => this.setTokens(tokens))
    );
  }

  logout(): void {
    this.setTokens({ access: '', refresh: '' });
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  getRefreshToken(): string | null {
    return this.refreshToken();
  }

  private setTokens(tokens: TokenPair): void {
    const access = tokens.access || null;
    const refresh = tokens.refresh || null;
    this.accessToken.set(access);
    this.refreshToken.set(refresh);
    this.writeStorage(ACCESS_TOKEN_KEY, access);
    this.writeStorage(REFRESH_TOKEN_KEY, refresh);
  }

  private readStorage(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key);
  }

  private writeStorage(key: string, value: string | null): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (value) {
      window.localStorage.setItem(key, value);
      return;
    }
    window.localStorage.removeItem(key);
  }
}
