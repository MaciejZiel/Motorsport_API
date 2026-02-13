import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { API_DOCS_URL } from './api.config';
import { AuthService } from './core/auth.service';

interface NavLink {
  path: string;
  label: string;
  requiresAuth?: boolean;
}

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'motorsport_theme';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly theme = signal<ThemeMode>(this.resolveInitialTheme());
  readonly isDarkMode = computed(() => this.theme() === 'dark');

  readonly title = 'Motorsport Control Center';
  readonly docsUrl = API_DOCS_URL;
  readonly navLinks: NavLink[] = [
    { path: '/', label: 'Dashboard' },
    { path: '/drivers', label: 'Drivers', requiresAuth: true },
    { path: '/teams', label: 'Teams', requiresAuth: true },
    { path: '/races', label: 'Races', requiresAuth: true },
  ];

  constructor() {
    this.applyTheme(this.theme());
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.isDarkMode() ? 'light' : 'dark';
    this.theme.set(nextTheme);
    this.applyTheme(nextTheme);
    this.persistTheme(nextTheme);
  }

  async handleLogout(): Promise<void> {
    this.auth.logout();
    await this.router.navigateByUrl('/login');
  }

  private resolveInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  private applyTheme(theme: ThemeMode): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }

  private persistTheme(theme: ThemeMode): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}
