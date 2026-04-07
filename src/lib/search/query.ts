import { normalizeQuery, splitTerms } from './normalize';
import { expandSynonyms } from './synonyms';

export type ParsedQuery = {
  normalized: string;
  phrases: string[];
  terms: string[];
  expandedTerms: string[];
};

export const parseQuotedPhrases = (input: string): string[] => {
  const matches = input.matchAll(/"([^"]+)"/g);
  return [...matches].map((match) => normalizeQuery(match[1])).filter(Boolean);
};

export const parseSearchQuery = (input: string): ParsedQuery => {
  const normalized = normalizeQuery(input);
  const phrases = parseQuotedPhrases(normalized);
  const bare = normalized.replace(/"[^"]+"/g, ' ');
  const terms = splitTerms(bare);
  const expandedTerms = [...new Set(terms.flatMap((term) => expandSynonyms(term)))];

  return {
    normalized,
    phrases,
    terms,
    expandedTerms,
  };
};
