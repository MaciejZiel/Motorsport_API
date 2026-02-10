import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { API_DOCS_URL } from './api.config';
import { AuthService } from './core/auth.service';

interface NavLink {
  path: string;
  label: string;
  requiresAuth?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly title = 'Motorsport Control Center';
  readonly docsUrl = API_DOCS_URL;
  readonly navLinks: NavLink[] = [
    { path: '/', label: 'Dashboard' },
    { path: '/drivers', label: 'Drivers', requiresAuth: true },
    { path: '/teams', label: 'Teams', requiresAuth: true },
    { path: '/races', label: 'Races', requiresAuth: true },
  ];

  async handleLogout(): Promise<void> {
    this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
