import { Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard-page.component';
import { DriversPageComponent } from './pages/drivers-page.component';
import { RacesPageComponent } from './pages/races-page.component';
import { TeamsPageComponent } from './pages/teams-page.component';

export const routes: Routes = [
  { path: '', component: DashboardPageComponent },
  { path: 'drivers', component: DriversPageComponent },
  { path: 'teams', component: TeamsPageComponent },
  { path: 'races', component: RacesPageComponent },
  { path: '**', redirectTo: '' },
];
