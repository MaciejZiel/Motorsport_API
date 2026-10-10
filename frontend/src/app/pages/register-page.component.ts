import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { apiErrorMessages } from '../core/ui-error.utils';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './auth-page.scss',
  template: `
    <div class="page auth">
      <section class="auth-main" aria-labelledby="register-title">
        <h1 id="register-title" class="page-title">Create an account</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="reg-username">Username</label>
            <input id="reg-username" formControlName="username" autocomplete="username" />
            @if (form.controls.username.touched && form.controls.username.invalid) {
              <p class="field-error">Choose a username.</p>
            }
          </div>
          <div class="field">
            <label for="reg-password">Password</label>
            <input id="reg-password" type="password" formControlName="password" autocomplete="new-password" />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <p class="field-error">Use at least 8 characters.</p>
            }
          </div>
          <div class="field">
            <label for="reg-confirm">Repeat password</label>
            <input id="reg-confirm" type="password" formControlName="passwordConfirm" autocomplete="new-password" />
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Creating account' : 'Create account' }}
          </button>
        </form>
        @if (errorMessage(); as message) {
          <div class="notice is-error" role="alert">{{ message }}</div>
        }
        <p class="switch">Already registered? <a routerLink="/login">Sign in</a></p>
      </section>

      <aside class="auth-side" aria-labelledby="new-title">
        <h2 id="new-title">New accounts are read-only</h2>
        <dl>
          <div>
            <dt>What you get</dt>
            <dd>The same view as the demo account. Staff rights are granted by an administrator.</dd>
          </div>
        </dl>
      </aside>
    </div>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    passwordConfirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password, passwordConfirm } = this.form.getRawValue();
    if (password !== passwordConfirm) {
      this.errorMessage.set("The passwords don't match.");
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    try {
      await firstValueFrom(this.auth.register(username, password, passwordConfirm));
      await this.router.navigateByUrl('/');
    } catch (error) {
      const details = apiErrorMessages(error);
      if (error instanceof HttpErrorResponse && error.status === 0) {
        this.errorMessage.set("Couldn't reach the API. Check that it's running and try again.");
      } else {
        this.errorMessage.set(details.length ? details.join(' ') : 'The account was not created. Try again.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
