import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface BackOfficeSection {
  label: string;
  path: string;
  description: string;
}

/** Django admin lives on the API server; in `ng serve` that's port 8000. */
export function backOfficeUrl(path: string, location: Pick<Location, 'protocol' | 'hostname' | 'port'> | null = typeof window === 'undefined' ? null : window.location): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (location?.port === '4200') {
    return `${location.protocol}//${location.hostname}:8000${normalized}`;
  }
  return normalized;
}

@Component({
  selector: 'app-admin-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-title">Admin</h1>
          <p class="page-lede">
            Records are edited in the Django back-office. Race calendar entries can also be added
            from the <a routerLink="/races">calendar</a>.
          </p>
        </div>
        <a class="btn btn-primary" [href]="home" target="_blank" rel="noopener">Open back-office</a>
      </header>

      <section class="panel">
        <table class="data-table">
          <caption class="visually-hidden">Back-office sections</caption>
          <thead>
            <tr><th scope="col">Section</th><th scope="col">What you can change</th><th scope="col"><span class="visually-hidden">Link</span></th></tr>
          </thead>
          <tbody>
            @for (section of sections; track section.path) {
              <tr>
                <td class="label">{{ section.label }}</td>
                <td class="muted">{{ section.description }}</td>
                <td class="r">
                  <a [href]="section.href" target="_blank" rel="noopener">Open {{ section.label.toLowerCase() }}</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: `
    .label { font-weight: 600; white-space: nowrap; }
    .page-lede a { color: var(--text); }
  `,
})
export class AdminPageComponent {
  private readonly config: BackOfficeSection[] = [
    { label: 'Users', path: '/admin/auth/user/', description: 'Accounts and staff rights.' },
    { label: 'Teams', path: '/admin/racing/team/', description: 'Team names and countries.' },
    { label: 'Drivers', path: '/admin/racing/driver/', description: 'Drivers and their team.' },
    { label: 'Seasons', path: '/admin/racing/season/', description: 'Championship years.' },
    { label: 'Races', path: '/admin/racing/race/', description: 'Calendar rounds and dates.' },
    { label: 'Race results', path: '/admin/racing/raceresult/', description: 'Classifications, points and fastest laps.' },
  ];

  readonly home = backOfficeUrl('/admin/');
  readonly sections = this.config.map((section) => ({ ...section, href: backOfficeUrl(section.path) }));
}
