import { Component } from '@angular/core';

interface AdminLink {
  label: string;
  href: string;
  description: string;
}

interface AdminLinkConfig {
  label: string;
  path: string;
  description: string;
}

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
  private readonly linkConfigs: AdminLinkConfig[] = [
    {
      label: 'Users',
      path: '/admin/auth/user/',
      description: 'Manage user accounts and permissions.',
    },
    {
      label: 'Teams',
      path: '/admin/racing/team/',
      description: 'Create, edit, and remove teams.',
    },
    {
      label: 'Drivers',
      path: '/admin/racing/driver/',
      description: 'Manage drivers and team assignments.',
    },
    {
      label: 'Seasons',
      path: '/admin/racing/season/',
      description: 'Manage seasons used by races.',
    },
    {
      label: 'Races',
      path: '/admin/racing/race/',
      description: 'Create and edit race calendar entries.',
    },
    {
      label: 'Race Results',
      path: '/admin/racing/raceresult/',
      description: 'Maintain race result records.',
    },
  ];
  readonly adminHomeUrl = this.toBackendAdminUrl('/admin/');
  readonly links: AdminLink[] = this.linkConfigs.map((item) => ({
    label: item.label,
    href: this.toBackendAdminUrl(item.path),
    description: item.description,
  }));

  private toBackendAdminUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (typeof window === 'undefined') {
      return normalizedPath;
    }

    const { protocol, hostname, port } = window.location;
    if (port === '4200') {
      return `${protocol}//${hostname}:8000${normalizedPath}`;
    }

    return normalizedPath;
  }
}
