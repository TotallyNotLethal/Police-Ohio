import { splitTerms, normalizeSectionNumber } from './normalize';
import type { ParsedQuery } from './query';
import type { SearchableSection } from './types';
import { isTypoTolerantMatch } from './typo';

const WEIGHTS = {
  exactSectionNumber: 120,
  exactHeading: 100,
  headingPartial: 45,
  aliasesSynonyms: 35,
  summaryTags: 20,
  fullText: 12,
} as const;

const coerceStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (value && typeof value === 'object') {
    return Object.values(value)
      .filter((entry): entry is string => typeof entry === 'string')
      .flatMap((entry) => entry.split(','));
  }
  return [];
};

export const buildSnippet = (bodyText: string, terms: string[]): string => {
  const plain = bodyText.replace(/\s+/g, ' ').trim();
  if (!plain) return '';

  const lower = plain.toLowerCase();
  const matchIndex = terms
    .map((term) => lower.indexOf(term))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0];

  if (matchIndex === undefined) {
    return `${plain.slice(0, 180)}${plain.length > 180 ? '…' : ''}`;
  }

  const start = Math.max(0, matchIndex - 70);
  const end = Math.min(plain.length, matchIndex + 110);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < plain.length ? '…' : '';
  return `${prefix}${plain.slice(start, end)}${suffix}`;
};

export const rankSection = (section: SearchableSection, parsedQuery: ParsedQuery): { score: number; matchedSignals: string[] } => {
  const signals: string[] = [];
  let score = 0;

  const sectionNumber = normalizeSectionNumber(section.sectionNumber);
  const heading = section.heading.toLowerCase().trim();
  const aliases = coerceStringArray(section.aliases).map((item) => item.toLowerCase());
  const tags = coerceStringArray(section.tags).map((item) => item.toLowerCase());
  const fullText = (section.bodyText ?? '').toLowerCase();

  if (parsedQuery.normalized === sectionNumber) {
    score += WEIGHTS.exactSectionNumber;
    signals.push('exactSectionNumber');
  }

  if (parsedQuery.normalized === heading) {
    score += WEIGHTS.exactHeading;
    signals.push('exactHeading');
  }

  if (parsedQuery.terms.some((term) => heading.includes(term)) || parsedQuery.phrases.some((phrase) => heading.includes(phrase))) {
    score += WEIGHTS.headingPartial;
    signals.push('headingPartial');
  }

  if (
    parsedQuery.expandedTerms.some((term) =>
      aliases.some((alias) => alias.includes(term) || isTypoTolerantMatch(term, alias.split(' ')[0] ?? alias)),
    )
  ) {
    score += WEIGHTS.aliasesSynonyms;
    signals.push('aliasesSynonyms');
  }

  if (parsedQuery.expandedTerms.some((term) => tags.some((tag) => tag.includes(term)))) {
    score += WEIGHTS.summaryTags;
    signals.push('summaryTags');
  }

  const textTerms = splitTerms(fullText);
  if (
    parsedQuery.terms.some((term) => textTerms.includes(term) || textTerms.some((candidate) => isTypoTolerantMatch(term, candidate))) ||
    parsedQuery.phrases.some((phrase) => fullText.includes(phrase))
  ) {
    score += WEIGHTS.fullText;
    signals.push('fullText');
  }

  return { score, matchedSignals: signals };
};
