import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guards';
import { DashboardPageComponent } from './pages/dashboard-page.component';
import { DriverDetailPageComponent } from './pages/driver-detail-page.component';
import { DriversPageComponent } from './pages/drivers-page.component';
import { LoginPageComponent } from './pages/login-page.component';
import { RaceDetailPageComponent } from './pages/race-detail-page.component';
import { RacesPageComponent } from './pages/races-page.component';
import { RegisterPageComponent } from './pages/register-page.component';
import { TeamDetailPageComponent } from './pages/team-detail-page.component';
import { TeamsPageComponent } from './pages/teams-page.component';

export const routes: Routes = [
  { path: '', component: DashboardPageComponent },
  { path: 'drivers', component: DriversPageComponent, canActivate: [authGuard] },
  { path: 'drivers/:id', component: DriverDetailPageComponent, canActivate: [authGuard] },
  { path: 'teams', component: TeamsPageComponent, canActivate: [authGuard] },
  { path: 'teams/:id', component: TeamDetailPageComponent, canActivate: [authGuard] },
  { path: 'races', component: RacesPageComponent, canActivate: [authGuard] },
  { path: 'races/:id', component: RaceDetailPageComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginPageComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterPageComponent, canActivate: [guestGuard] },
  { path: '**', redirectTo: '' },
];
