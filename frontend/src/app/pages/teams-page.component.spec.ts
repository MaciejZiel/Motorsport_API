import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { TeamsPageComponent } from './teams-page.component';

describe('TeamsPageComponent', () => {
  let fixture: ComponentFixture<TeamsPageComponent>;
  let component: TeamsPageComponent;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    const getTeamsSpy = vi.fn().mockReturnValue(
      of({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })
    );
    navigateSpy = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [TeamsPageComponent],
      providers: [
        {
          provide: MotorsportApiService,
          useValue: {
            getTeams: getTeamsSpy,
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

    fixture = TestBed.createComponent(TeamsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('builds query params from active filters', async () => {
    component.nameFilter = 'Red';
    component.countryFilter = 'Italy';

    component.applyFilters();
    await fixture.whenStable();

    const navigateCall = navigateSpy.mock.calls.at(-1);
    expect(navigateCall).toBeDefined();
    expect(navigateCall?.[1]?.queryParams).toEqual({
      name: 'Red',
      country: 'Italy',
    });
  });

  it('marks filters as active when any filter has value', () => {
    component.nameFilter = 'Blue Arrow';

    expect(component.hasActiveFilters()).toBe(true);
  });
});
