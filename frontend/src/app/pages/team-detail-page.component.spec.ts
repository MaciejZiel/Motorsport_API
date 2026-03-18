import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { TeamDetailPageComponent } from './team-detail-page.component';

describe('TeamDetailPageComponent', () => {
  let fixture: ComponentFixture<TeamDetailPageComponent>;
  let component: TeamDetailPageComponent;
  let getTeamByIdSpy: ReturnType<typeof vi.fn>;
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    params$ = new BehaviorSubject(convertToParamMap({ id: '1' }));
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getTeamByIdSpy = vi.fn().mockReturnValue(
      of({
        id: 1,
        name: 'Red Apex',
        country: 'Italy',
        driver_count: 2,
        drivers: [
          { id: 1, name: 'Max Fast', points: 250 },
          { id: 2, name: 'Luca Stone', points: 180 },
        ],
      })
    );

    await TestBed.configureTestingModule({
      imports: [TeamDetailPageComponent],
      providers: [
        {
          provide: MotorsportApiService,
          useValue: {
            getTeamById: getTeamByIdSpy,
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

    fixture = TestBed.createComponent(TeamDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('loads team details for valid route id', () => {
    expect(getTeamByIdSpy).toHaveBeenCalledWith(1);
    expect(component.state()).toBe('ready');
    expect(component.team()?.name).toBe('Red Apex');
    expect(component.errorMessage()).toBeNull();
  });

  it('shows not found message when API returns 404', async () => {
    getTeamByIdSpy.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );

    params$.next(convertToParamMap({ id: '9' }));
    await fixture.whenStable();

    expect(component.state()).toBe('error');
    expect(component.errorMessage()).toBe('Team not found.');
  });

  it('handles invalid route id without API call', async () => {
    params$.next(convertToParamMap({ id: 'abc' }));
    await fixture.whenStable();

    expect(component.state()).toBe('error');
    expect(component.errorMessage()).toBe('Invalid team id in URL.');
    expect(getTeamByIdSpy).toHaveBeenCalledTimes(1);
  });
});
