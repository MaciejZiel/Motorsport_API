import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guards';
import { DashboardPageComponent } from './pages/dashboard-page.component';
import { DriversPageComponent } from './pages/drivers-page.component';
import { LoginPageComponent } from './pages/login-page.component';
import { RacesPageComponent } from './pages/races-page.component';
import { TeamsPageComponent } from './pages/teams-page.component';

export const routes: Routes = [
  { path: '', component: DashboardPageComponent },
  { path: 'drivers', component: DriversPageComponent, canActivate: [authGuard] },
  { path: 'teams', component: TeamsPageComponent, canActivate: [authGuard] },
  { path: 'races', component: RacesPageComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginPageComponent, canActivate: [guestGuard] },
  { path: '**', redirectTo: '' },
];
