import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Provider, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { ApiMock } from './fixtures';

/** Configures TestBed with the API mock and the given routes. */
export function setupPage(api: ApiMock, routes: Routes, extra: Provider[] = []): void {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter(routes),
      { provide: MotorsportApiService, useValue: api },
      ...extra,
    ],
  });
}

/** Navigates to `url` and returns the routed component and its element. */
export async function openPage<T>(url: string, type: Type<T>) {
  const harness = await RouterTestingHarness.create();
  const page = await harness.navigateByUrl(url, type);
  harness.detectChanges();
  await harness.fixture.whenStable();
  return { harness, page, el: harness.routeNativeElement as HTMLElement };
}
