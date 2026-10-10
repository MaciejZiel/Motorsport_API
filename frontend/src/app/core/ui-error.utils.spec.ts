import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessages } from './ui-error.utils';

describe('apiErrorMessages', () => {
  it('reads field errors from the API envelope', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { error: 'bad_request', detail: 'Request failed.', errors: { round_number: ['Already taken.'], name: ['Required.'] } },
    });
    expect(apiErrorMessages(error)).toEqual(['Already taken.', 'Required.']);
  });

  it('falls back to detail and ignores non-HTTP errors', () => {
    const error = new HttpErrorResponse({ status: 403, error: { detail: 'Not allowed.' } });
    expect(apiErrorMessages(error)).toEqual(['Not allowed.']);
    expect(apiErrorMessages(new Error('x'))).toEqual([]);
  });
});
