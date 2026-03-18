import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { RaceDetailPageComponent } from './race-detail-page.component';

describe('RaceDetailPageComponent', () => {
  let fixture: ComponentFixture<RaceDetailPageComponent>;
  let component: RaceDetailPageComponent;
  let getRaceByIdSpy: ReturnType<typeof vi.fn>;
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    params$ = new BehaviorSubject(convertToParamMap({ id: '1' }));
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getRaceByIdSpy = vi.fn().mockReturnValue(
      of({
        id: 1,
        name: 'Australian Grand Prix',
        country: 'Australia',
        round_number: 1,
        race_date: '2026-03-15',
        season_year: 2026,
      })
    );

    await TestBed.configureTestingModule({
      imports: [RaceDetailPageComponent],
      providers: [
        {
          provide: MotorsportApiService,
          useValue: {
            getRaceById: getRaceByIdSpy,
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

    fixture = TestBed.createComponent(RaceDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('loads race details for valid route id', () => {
    expect(getRaceByIdSpy).toHaveBeenCalledWith(1);
    expect(component.state()).toBe('ready');
    expect(component.race()?.name).toBe('Australian Grand Prix');
    expect(component.errorMessage()).toBeNull();
  });

  it('shows not found message when API returns 404', async () => {
    getRaceByIdSpy.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );

    params$.next(convertToParamMap({ id: '9' }));
    await fixture.whenStable();

    expect(component.state()).toBe('error');
    expect(component.errorMessage()).toBe('Race not found.');
  });

  it('handles invalid route id without API call', async () => {
    params$.next(convertToParamMap({ id: 'abc' }));
    await fixture.whenStable();

    expect(component.state()).toBe('error');
    expect(component.errorMessage()).toBe('Invalid race id in URL.');
    expect(getRaceByIdSpy).toHaveBeenCalledTimes(1);
  });
});
