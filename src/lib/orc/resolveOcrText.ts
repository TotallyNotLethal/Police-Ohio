import type { OrcCode } from '@prisma/client';

import { prisma } from '../db/prisma';

const SECTION_REGEX = /\b\d{4}\.\d{2,3}\b/g;

export type OcrMatch = {
  candidate: string;
  normalizedSection: string;
  confidence: 'high' | 'medium' | 'low';
  reason: 'regex-match' | 'prefixed-reference' | 'deduplicated';
  record?: OrcCode;
};

export type ResolveOcrTextResult = {
  candidates: OcrMatch[];
  matches: OcrMatch[];
  unresolved: OcrMatch[];
};

const normalizeSectionToken = (value: string): string | null => {
  const match = value.match(SECTION_REGEX)?.[0];
  if (!match) {
    return null;
  }

  return match.trim();
};

const collectCandidates = (ocrText: string): OcrMatch[] => {
  const regexMatches = ocrText.match(SECTION_REGEX) ?? [];

  const prefixedMatches = [
    ...ocrText.matchAll(/\b(?:ORC|R\.C\.|Ohio\s+Revised\s+Code|section)\s*(\d{4}\.\d{2,3})\b/gi),
  ].map((entry) => entry[1]);

  const seen = new Set<string>();
  const candidates: OcrMatch[] = [];

  for (const raw of [...regexMatches, ...prefixedMatches]) {
    const normalizedSection = normalizeSectionToken(raw);
    if (!normalizedSection) {
      continue;
    }

    const alreadySeen = seen.has(normalizedSection);
    const wasPrefixed = prefixedMatches.includes(raw);
    seen.add(normalizedSection);

    candidates.push({
      candidate: raw,
      normalizedSection,
      confidence: alreadySeen ? 'low' : wasPrefixed ? 'high' : 'medium',
      reason: alreadySeen ? 'deduplicated' : wasPrefixed ? 'prefixed-reference' : 'regex-match',
    });
  }

  return candidates;
};

export const resolveOcrText = async (ocrText: string): Promise<ResolveOcrTextResult> => {
  const candidates = collectCandidates(ocrText);

  const uniqueSections = [...new Set(candidates.map((candidate) => candidate.normalizedSection))];
  const records = await prisma.orcCode.findMany({
    where: {
      sectionNumber: {
        in: uniqueSections,
      },
    },
  });

  const recordBySection = new Map(records.map((record) => [record.sectionNumber, record]));

  const resolvedCandidates = candidates.map((candidate) => ({
    ...candidate,
    record: recordBySection.get(candidate.normalizedSection),
  }));

  return {
    candidates: resolvedCandidates,
    matches: resolvedCandidates.filter((candidate) => Boolean(candidate.record)),
    unresolved: resolvedCandidates.filter((candidate) => !candidate.record),
  };
};

export { SECTION_REGEX };
