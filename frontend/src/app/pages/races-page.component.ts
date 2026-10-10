import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { isUpcoming } from '../core/championship';
import { AuthService } from '../core/auth.service';
import { formatDayMonth } from '../core/date-format.utils';
import { MotorsportApiService } from '../core/motorsport-api.service';
import { Race, RaceResult, Season } from '../core/motorsport-api.types';
import { driverCode, teamColor } from '../core/team-identity';
import { apiErrorMessages, reportUiError } from '../core/ui-error.utils';
import { LoadState, LoadStateComponent } from '../shared/load-state.component';

export type WriteState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-races-page',
  imports: [RouterLink, ReactiveFormsModule, LoadStateComponent],
  templateUrl: './races-page.component.html',
  styleUrl: './races-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RacesPageComponent {
  private readonly api = inject(MotorsportApiService);
  readonly auth = inject(AuthService);

  readonly dayMonth = formatDayMonth;

  readonly state = signal<LoadState>('loading');
  readonly seasons = signal<Season[]>([]);
  readonly races = signal<Race[]>([]);
  readonly results = signal<RaceResult[]>([]);

  readonly writeState = signal<WriteState>('idle');
  readonly writeMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    country: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    seasonId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    round: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly calendar = computed(() => {
    const winners = new Map<number, RaceResult>();
    const classified = new Set<number>();
    for (const result of this.results()) {
      classified.add(result.race.id);
      if (result.position === 1) {
        winners.set(result.race.id, result);
      }
    }
    const years = [...new Set(this.races().map((race) => race.season_year))].sort((a, b) => b - a);
    return years.map((year) => ({
      year,
      races: this.races()
        .filter((race) => race.season_year === year)
        .sort((a, b) => a.round_number - b.round_number)
        .map((race) => {
          const winner = winners.get(race.id);
          return {
            ...race,
            status: classified.has(race.id) ? 'finished' : isUpcoming(race) ? 'upcoming' : 'pending',
            winner: winner
              ? {
                  id: winner.driver.id,
                  name: winner.driver.name,
                  code: driverCode(winner.driver.name),
                  team: winner.driver.team.name,
                  color: teamColor(winner.driver.team.name),
                }
              : null,
          };
        }),
    }));
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    forkJoin({
      seasons: this.api.getSeasons(),
      races: this.api.getRaces(),
      results: this.api.getResults(),
    }).subscribe({
      next: ({ seasons, races, results }) => {
        this.seasons.set([...seasons].sort((a, b) => b.year - a.year));
        this.races.set(races);
        this.results.set(results);
        if (this.form.controls.seasonId.value === null && seasons.length) {
          this.form.controls.seasonId.setValue(this.seasons()[0].id);
        }
        this.state.set('ready');
      },
      error: (error: unknown) => {
        reportUiError(error);
        this.state.set('error');
      },
    });
  }

  addRace(): void {
    if (!this.auth.isAdmin() || this.writeState() === 'saving') {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.writeState.set('saving');
    this.writeMessage.set(null);

    this.api
      .createRace({
        name: value.name.trim(),
        country: value.country.trim(),
        season_id: Number(value.seasonId),
        round_number: Number(value.round),
        race_date: value.date,
      })
      .subscribe({
        next: (race) => {
          this.races.update((races) => [...races, race]);
          this.writeState.set('saved');
          this.writeMessage.set(`Added the ${race.name} as round ${race.round_number} of ${race.season_year}.`);
          this.form.reset({ seasonId: value.seasonId });
        },
        error: (error: unknown) => {
          reportUiError(error);
          this.writeState.set('error');
          this.writeMessage.set(this.describeWriteError(error));
        },
      });
  }

  private describeWriteError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Your session has expired. Sign in again to add races.';
      }
      if (error.status === 403) {
        return 'The API refused the change (403): this account can read data but not edit it.';
      }
      const details = apiErrorMessages(error);
      if (error.status === 400 && details.length) {
        return `The API rejected the race: ${details.join(' ')}`;
      }
    }
    return "The race wasn't saved because the API didn't respond. Try again.";
  }
}
