export const normalizeQuery = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ');

export const splitTerms = (value: string): string[] =>
  normalizeQuery(value)
    .split(/[^a-z0-9.]+/)
    .map((term) => term.trim())
    .filter(Boolean);

export const normalizeSectionNumber = (value: string): string => value.trim().replace(/^section[-\s]*/i, '').toLowerCase();
