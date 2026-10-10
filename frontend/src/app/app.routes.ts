import { Routes } from '@angular/router';
import { adminGuard, guestGuard } from './core/auth.guards';
import { AdminPageComponent } from './pages/admin-page.component';
import { DriverDetailPageComponent } from './pages/driver-detail-page.component';
import { DriversPageComponent } from './pages/drivers-page.component';
import { LoginPageComponent } from './pages/login-page.component';
import { RaceDetailPageComponent } from './pages/race-detail-page.component';
import { RacesPageComponent } from './pages/races-page.component';
import { RegisterPageComponent } from './pages/register-page.component';
import { StandingsPageComponent } from './pages/standings-page.component';
import { TeamDetailPageComponent } from './pages/team-detail-page.component';
import { TeamsPageComponent } from './pages/teams-page.component';

export const routes: Routes = [
  { path: '', component: StandingsPageComponent, title: 'Standings | Pit Wall' },
  { path: 'drivers', component: DriversPageComponent, title: 'Drivers | Pit Wall' },
  { path: 'drivers/:id', component: DriverDetailPageComponent, title: 'Driver | Pit Wall' },
  { path: 'teams', component: TeamsPageComponent, title: 'Teams | Pit Wall' },
  { path: 'teams/:id', component: TeamDetailPageComponent, title: 'Team | Pit Wall' },
  { path: 'races', component: RacesPageComponent, title: 'Calendar | Pit Wall' },
  { path: 'races/:id', component: RaceDetailPageComponent, title: 'Race | Pit Wall' },
  { path: 'admin', component: AdminPageComponent, canActivate: [adminGuard], title: 'Admin | Pit Wall' },
  { path: 'login', component: LoginPageComponent, canActivate: [guestGuard], title: 'Sign in | Pit Wall' },
  { path: 'register', component: RegisterPageComponent, canActivate: [guestGuard], title: 'Create account | Pit Wall' },
  { path: '**', redirectTo: '' },
];
