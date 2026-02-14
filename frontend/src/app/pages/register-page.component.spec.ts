import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { RegisterPageComponent } from './register-page.component';

describe('RegisterPageComponent', () => {
  let authMock: {
    register: ReturnType<typeof vi.fn>;
  };
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    authMock = {
      register: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ next: '/teams' }) } },
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('registers and redirects to the requested route', async () => {
    authMock.register.mockReturnValue(of({ access: 'access', refresh: 'refresh' }));

    const fixture = TestBed.createComponent(RegisterPageComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      username: 'newfan',
      password: 'StrongPass123!',
      passwordConfirm: 'StrongPass123!',
    });

    await component.submit();

    expect(authMock.register).toHaveBeenCalledWith('newfan', 'StrongPass123!', 'StrongPass123!');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/teams');
    expect(component.errorMessage()).toBeNull();
  });

  it('blocks submit when passwords do not match', async () => {
    const fixture = TestBed.createComponent(RegisterPageComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      username: 'newfan',
      password: 'StrongPass123!',
      passwordConfirm: 'DifferentPass123!',
    });

    await component.submit();

    expect(authMock.register).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Passwords do not match.');
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('shows backend validation message from structured errors', async () => {
    authMock.register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: { username: ['Username already exists.'] } },
          })
      )
    );

    const fixture = TestBed.createComponent(RegisterPageComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      username: 'existing',
      password: 'StrongPass123!',
      passwordConfirm: 'StrongPass123!',
    });

    await component.submit();

    expect(component.errorMessage()).toBe('Username already exists.');
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });
});
