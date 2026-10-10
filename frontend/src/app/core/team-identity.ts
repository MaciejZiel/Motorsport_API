/**
 * The API has no colour field, so each team gets a livery colour from the
 * colour word in its name, or a stable fallback picked from its name.
 */
const NAMED_LIVERIES: ReadonlyArray<[RegExp, string]> = [
  [/\b(red|scarlet|crimson)\b/i, '#ff5257'],
  [/\b(blue|azure|navy)\b/i, '#4d90ff'],
  [/\b(green|emerald)\b/i, '#2fc47c'],
  [/\b(silver|grey|gray|steel)\b/i, '#c5ced8'],
  [/\b(orange|papaya)\b/i, '#ff8a2a'],
  [/\b(yellow|gold)\b/i, '#f4c430'],
  [/\b(pink|rose)\b/i, '#ff7ab8'],
  [/\b(white)\b/i, '#eef1f4'],
];

const FALLBACK_LIVERIES = ['#ff8a2a', '#22c3c3', '#f4c430', '#ff7ab8', '#9bd14b', '#e8875f'];

export function teamColor(teamName: string | null | undefined): string {
  const name = (teamName ?? '').trim();
  if (!name) {
    return '#8a96a3';
  }
  for (const [pattern, color] of NAMED_LIVERIES) {
    if (pattern.test(name)) {
      return color;
    }
  }
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return FALLBACK_LIVERIES[hash % FALLBACK_LIVERIES.length];
}

/** Three-letter timing-screen code: the first three letters of the surname. */
export function driverCode(driverName: string | null | undefined): string {
  const words = (driverName ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return '---';
  }
  const surname = words[words.length - 1].replace(/[^\p{L}]/gu, '');
  return (surname || words[0]).slice(0, 3).toUpperCase().padEnd(3, '-');
}
