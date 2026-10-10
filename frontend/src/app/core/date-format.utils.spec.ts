import { formatApiDate, formatDayMonth } from './date-format.utils';

describe('date-format utils', () => {
  it('formats API dates in UTC', () => {
    expect(formatApiDate('2026-04-19')).toBe('19 Apr 2026');
    expect(formatDayMonth('2026-03-05')).toBe('05 Mar');
  });

  it('returns unknown formats unchanged', () => {
    expect(formatApiDate('2026/04/19')).toBe('2026/04/19');
    expect(formatDayMonth('soon')).toBe('soon');
  });
});
