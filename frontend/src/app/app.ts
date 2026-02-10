import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { API_DOCS_URL } from './api.config';

interface NavLink {
  path: string;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly title = 'Motorsport Control Center';
  readonly docsUrl = API_DOCS_URL;
  readonly navLinks: NavLink[] = [
    { path: '/', label: 'Dashboard' },
    { path: '/drivers', label: 'Drivers' },
    { path: '/teams', label: 'Teams' },
    { path: '/races', label: 'Races' },
  ];
}
