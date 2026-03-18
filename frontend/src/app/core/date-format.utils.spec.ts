import { formatApiDate } from './date-format.utils';

describe('formatApiDate', () => {
  it('formats API date as a readable short date', () => {
    expect(formatApiDate('2026-04-19')).toBe('Apr 19, 2026');
  });

  it('ignores extra whitespace around date string', () => {
    expect(formatApiDate(' 2026-03-15 ')).toBe('Mar 15, 2026');
  });

  it('returns original value for non-ISO date input', () => {
    expect(formatApiDate('19/04/2026')).toBe('19/04/2026');
  });
});
