import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { DriversPageComponent } from './drivers-page.component';

describe('DriversPageComponent', () => {
  let fixture: ComponentFixture<DriversPageComponent>;
  let component: DriversPageComponent;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    const getDriversSpy = vi.fn().mockReturnValue(
      of({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })
    );
    navigateSpy = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [DriversPageComponent],
      providers: [
        {
          provide: MotorsportApiService,
          useValue: {
            getDrivers: getDriversSpy,
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: navigateSpy,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DriversPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('builds query params correctly when numeric filters come from number inputs', async () => {
    component.teamIdFilter = 2;
    component.countryFilter = 'Italy';
    component.minPointsFilter = 100;

    component.applyFilters();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalled();
    const navigateCall = navigateSpy.mock.calls.at(-1);
    expect(navigateCall).toBeDefined();
    expect(navigateCall?.[1]?.queryParams).toEqual({
      team: 2,
      country: 'Italy',
      min_points: 100,
    });
  });

  it('treats numeric filters as active', () => {
    component.teamIdFilter = 1;
    component.minPointsFilter = 0;

    expect(component.hasActiveFilters()).toBe(true);
  });
});
