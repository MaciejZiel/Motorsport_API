import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { DriverDetailPageComponent } from './driver-detail-page.component';

describe('DriverDetailPageComponent', () => {
  let fixture: ComponentFixture<DriverDetailPageComponent>;
  let component: DriverDetailPageComponent;
  let getDriverByIdSpy: ReturnType<typeof vi.fn>;
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    params$ = new BehaviorSubject(convertToParamMap({ id: '1' }));
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getDriverByIdSpy = vi.fn().mockReturnValue(
      of({
        id: 1,
        name: 'Max Fast',
        points: 250,
        team: { id: 1, name: 'Red Apex', country: 'Italy' },
      })
    );

    await TestBed.configureTestingModule({
      imports: [DriverDetailPageComponent],
      providers: [
        {
          provide: MotorsportApiService,
          useValue: {
            getDriverById: getDriverByIdSpy,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DriverDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('loads driver details for valid route id', () => {
    expect(getDriverByIdSpy).toHaveBeenCalledWith(1);
    expect(component.state()).toBe('ready');
    expect(component.driver()?.name).toBe('Max Fast');
    expect(component.errorMessage()).toBeNull();
  });

  it('shows not found message when API returns 404', async () => {
    getDriverByIdSpy.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );

    params$.next(convertToParamMap({ id: '9' }));
    await fixture.whenStable();

    expect(component.state()).toBe('error');
    expect(component.errorMessage()).toBe('Driver not found.');
  });

  it('handles invalid route id without API call', async () => {
    params$.next(convertToParamMap({ id: 'abc' }));
    await fixture.whenStable();

    expect(component.state()).toBe('error');
    expect(component.errorMessage()).toBe('Invalid driver id in URL.');
    expect(getDriverByIdSpy).toHaveBeenCalledTimes(1);
  });
});
