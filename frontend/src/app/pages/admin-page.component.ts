import { Component } from '@angular/core';

interface AdminLink {
  label: string;
  href: string;
  description: string;
}

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
  readonly links: AdminLink[] = [
    {
      label: 'Users',
      href: '/admin/auth/user/',
      description: 'Manage user accounts and permissions.',
    },
    {
      label: 'Teams',
      href: '/admin/racing/team/',
      description: 'Create, edit, and remove teams.',
    },
    {
      label: 'Drivers',
      href: '/admin/racing/driver/',
      description: 'Manage drivers and team assignments.',
    },
    {
      label: 'Seasons',
      href: '/admin/racing/season/',
      description: 'Manage seasons used by races.',
    },
    {
      label: 'Races',
      href: '/admin/racing/race/',
      description: 'Create and edit race calendar entries.',
    },
    {
      label: 'Race Results',
      href: '/admin/racing/raceresult/',
      description: 'Maintain race result records.',
    },
  ];
}
