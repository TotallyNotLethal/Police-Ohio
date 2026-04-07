import { canonicalUrlForSection, normalizeSectionNumber } from './normalizer';

export type ExtractedReference = {
  citationText: string;
  targetSectionNumber: string;
  targetUrl: string;
};

const SECTION_REFERENCE_REGEX = /\b(?:section|sections?)\s+([\d]{1,4}(?:\.[\dA-Za-z\-]+)+)/gi;

export const extractCrossReferences = (rawText: string): ExtractedReference[] => {
  const dedupe = new Set<string>();
  const references: ExtractedReference[] = [];

  for (const match of rawText.matchAll(SECTION_REFERENCE_REGEX)) {
    const targetSectionNumber = normalizeSectionNumber(match[1]);
    const key = `${match[0]}::${targetSectionNumber}`;
    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    references.push({
      citationText: match[0],
      targetSectionNumber,
      targetUrl: canonicalUrlForSection(targetSectionNumber),
    });
  }

  return references;
};
