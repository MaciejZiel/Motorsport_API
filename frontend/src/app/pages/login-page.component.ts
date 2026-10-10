import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DEMO_ACCOUNT } from '../api.config';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly demoUsername = DEMO_ACCOUNT.username;
  readonly pending = signal<'form' | 'demo' | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  async submit(): Promise<void> {
    if (this.pending()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.getRawValue();
    await this.signIn(username, password, 'form');
  }

  async continueAsDemo(): Promise<void> {
    if (this.pending()) {
      return;
    }
    await this.signIn(DEMO_ACCOUNT.username, DEMO_ACCOUNT.password, 'demo');
  }

  private async signIn(username: string, password: string, source: 'form' | 'demo'): Promise<void> {
    this.errorMessage.set(null);
    this.pending.set(source);
    try {
      await firstValueFrom(this.auth.login(username, password));
      const requested = this.route.snapshot.queryParamMap.get('next') || '/';
      const target = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';
      await this.router.navigateByUrl(target);
    } catch (error) {
      this.errorMessage.set(this.describe(error, source));
    } finally {
      this.pending.set(null);
    }
  }

  private describe(error: unknown, source: 'form' | 'demo'): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 400) {
        return source === 'demo'
          ? 'The demo account was rejected. It may not be seeded on this server (run seed_demo_user).'
          : 'Wrong username or password.';
      }
      if (error.status === 429) {
        return 'Too many sign-in attempts. Wait a minute and try again.';
      }
    }
    return "Couldn't reach the API to sign in. Check that it's running and try again.";
  }
}
