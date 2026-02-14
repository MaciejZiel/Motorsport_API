import { Routes } from '@angular/router';
import { adminGuard, guestGuard } from './core/auth.guards';
import { AdminPageComponent } from './pages/admin-page.component';
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
  { path: 'admin', component: AdminPageComponent, canActivate: [adminGuard] },
  { path: 'drivers', component: DriversPageComponent },
  { path: 'drivers/:id', component: DriverDetailPageComponent },
  { path: 'teams', component: TeamsPageComponent },
  { path: 'teams/:id', component: TeamDetailPageComponent },
  { path: 'races', component: RacesPageComponent },
  { path: 'races/:id', component: RaceDetailPageComponent },
  { path: 'login', component: LoginPageComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterPageComponent, canActivate: [guestGuard] },
  { path: '**', redirectTo: '' },
];
