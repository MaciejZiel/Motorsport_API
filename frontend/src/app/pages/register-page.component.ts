import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    passwordConfirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const { username, password, passwordConfirm } = this.form.getRawValue();
    if (password !== passwordConfirm) {
      this.errorMessage.set('Passwords do not match.');
      this.isSubmitting.set(false);
      return;
    }

    try {
      await firstValueFrom(this.auth.register(username, password, passwordConfirm));
      const requestedPath = this.route.snapshot.queryParamMap.get('next') || '/';
      const safeTarget = requestedPath.startsWith('/') ? requestedPath : '/';
      await this.router.navigateByUrl(safeTarget);
    } catch (error) {
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Registration failed. Try again.';
    }

    if (error.status === 0) {
      return 'Cannot connect to backend API.';
    }

    const payload = error.error as Record<string, unknown> | null;
    const errors = payload?.['errors'];
    if (errors && typeof errors === 'object') {
      const message = this.readFirstValidationMessage(errors as Record<string, unknown>);
      if (message) {
        return message;
      }
    }

    const detail = payload?.['detail'];
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    return 'Registration failed. Check your data and try again.';
  }

  private readFirstValidationMessage(errors: Record<string, unknown>): string | null {
    for (const value of Object.values(errors)) {
      if (Array.isArray(value)) {
        const first = value[0];
        if (typeof first === 'string' && first.trim()) {
          return first;
        }
      }
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    return null;
  }
}
