import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth.service';

describe('App', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
    window.localStorage.removeItem('motorsport_theme');
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), AuthService],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render app shell title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-title')?.textContent).toContain('Motorsport Control Center');
  });

  it('should honor theme query parameter override', () => {
    window.history.pushState({}, '', '/?theme=dark');

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.theme()).toBe('dark');
  });
});
