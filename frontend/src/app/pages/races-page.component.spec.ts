import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { RacesPageComponent } from './races-page.component';

describe('RacesPageComponent', () => {
  let fixture: ComponentFixture<RacesPageComponent>;
  let component: RacesPageComponent;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    const getRacesSpy = vi.fn().mockReturnValue(
      of({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })
    );
    navigateSpy = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [RacesPageComponent],
      providers: [
        {
          provide: MotorsportApiService,
          useValue: {
            getRaces: getRacesSpy,
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

    fixture = TestBed.createComponent(RacesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('builds query params from season and country filters', async () => {
    component.seasonFilter = 2026;
    component.countryFilter = 'Spain';

    component.applyFilters();
    await fixture.whenStable();

    const navigateCall = navigateSpy.mock.calls.at(-1);
    expect(navigateCall).toBeDefined();
    expect(navigateCall?.[1]?.queryParams).toEqual({
      season: 2026,
      country: 'Spain',
    });
  });

  it('treats season filter as active when it is numeric', () => {
    component.seasonFilter = 2025;

    expect(component.hasActiveFilters()).toBe(true);
  });
});
