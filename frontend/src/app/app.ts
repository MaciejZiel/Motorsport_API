import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_DOCS_URL } from './api.config';
import { ApiStatusService } from './core/api-status.service';
import { AuthService } from './core/auth.service';

interface NavLink {
  path: string;
  label: string;
  exact?: boolean;
  staffOnly?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly apiStatus = inject(ApiStatusService);

  readonly title = 'Pit Wall';
  readonly docsUrl = API_DOCS_URL;
  readonly repoUrl = 'https://github.com/MaciejZiel/Motorsport_API';
  readonly navLinks: NavLink[] = [
    { path: '/', label: 'Standings', exact: true },
    { path: '/races', label: 'Calendar' },
    { path: '/drivers', label: 'Drivers' },
    { path: '/teams', label: 'Teams' },
    { path: '/admin', label: 'Admin', staffOnly: true },
  ];

  readonly visibleLinks = computed(() =>
    this.navLinks.filter((link) => !link.staffOnly || this.auth.isAdmin())
  );

  readonly roleLabel = computed(() => (this.auth.isAdmin() ? 'Staff' : 'Read-only'));

  readonly statusLabel = computed(() => {
    switch (this.apiStatus.status()) {
      case 'online':
        return `API ${this.apiStatus.latencyMs()} ms`;
      case 'waking':
        return 'API waking up';
      case 'offline':
        return 'API offline';
      default:
        return 'API checking';
    }
  });

  constructor() {
    this.apiStatus.check();
    this.auth.ensureCsrfToken().subscribe();
    this.auth.ensureCurrentUser().subscribe();
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.auth.logout());
    await this.router.navigateByUrl('/');
  }
}
