import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  let authMock: {
    login: ReturnType<typeof vi.fn>;
    ensureCurrentUser: ReturnType<typeof vi.fn>;
  };
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    authMock = {
      login: vi.fn(),
      ensureCurrentUser: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ next: '/drivers' }) } },
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('logs in and redirects to the requested route', async () => {
    authMock.login.mockReturnValue(of({ access: 'access', refresh: 'refresh' }));
    authMock.ensureCurrentUser.mockReturnValue(
      of({ id: 1, username: 'admin', is_staff: true, is_superuser: true })
    );

    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;
    component.form.setValue({ username: 'admin', password: 'secret' });

    await component.submit();

    expect(authMock.login).toHaveBeenCalledWith('admin', 'secret');
    expect(authMock.ensureCurrentUser).toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/drivers');
    expect(component.errorMessage()).toBeNull();
  });

  it('shows auth error when credentials are invalid', async () => {
    authMock.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }))
    );
    authMock.ensureCurrentUser.mockReturnValue(of(null));

    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;
    component.form.setValue({ username: 'admin', password: 'wrong' });

    await component.submit();

    expect(component.errorMessage()).toBe('Invalid username or password.');
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });
});
