import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db/prisma';

type SearchItem = {
  section: string;
  heading: string;
  snippet: string;
  url: string;
};

type RankedCode = {
  sectionNumber: string;
  heading: string;
  plainText: string;
  score: number;
};

const buildUrl = (sectionNumber: string): string => `/sections/${sectionNumber}`;

const deriveHeading = (plainText: string): string => {
  const [firstLine = ''] = plainText.split(/\r?\n/, 1);
  return firstLine.trim();
};

const buildSnippet = (text: string, query: string): string => {
  if (!text) {
    return '';
  }

  const source = text.replace(/\s+/g, ' ').trim();
  const lower = source.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const hit = lower.indexOf(lowerQuery);

  if (hit === -1) {
    return source.slice(0, 200);
  }

  const start = Math.max(0, hit - 80);
  const end = Math.min(source.length, hit + lowerQuery.length + 120);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < source.length ? '…' : '';

  return `${prefix}${source.slice(start, end)}${suffix}`;
};

const rank = (query: string, row: { sectionNumber: string; heading: string; plainText: string }): RankedCode => {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedSection = row.sectionNumber.toLowerCase();
  const heading = row.heading.toLowerCase();
  const body = row.plainText.toLowerCase();

  let score = 0;

  if (normalizedSection === normalizedQuery) {
    score += 10_000;
  } else if (normalizedSection.includes(normalizedQuery)) {
    score += 3_500;
  }

  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phraseRegex = new RegExp(escapedQuery, 'i');
  if (phraseRegex.test(row.heading)) {
    score += 2_000;
  }
  if (phraseRegex.test(row.plainText)) {
    score += 1_200;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  for (const term of terms) {
    if (heading.includes(term)) {
      score += 150;
    }
    if (body.includes(term)) {
      score += 75;
    }
  }

  return {
    sectionNumber: row.sectionNumber,
    heading: row.heading,
    plainText: row.plainText,
    score,
  };
};

export const GET = async (request: NextRequest) => {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? '20');
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 50)) : 20;

  if (!query) {
    return NextResponse.json({ items: [] satisfies SearchItem[] });
  }

  const candidates = await prisma.orcCode.findMany({
    where: {
      OR: [
        { sectionNumber: { equals: query, mode: 'insensitive' } },
        { sectionNumber: { contains: query, mode: 'insensitive' } },
        { plainText: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      sectionNumber: true,
      plainText: true,
    },
    take: 500,
  });

  const ranked = candidates
    .map((candidate) => {
      const heading = deriveHeading(candidate.plainText ?? '');
      return rank(query, {
        sectionNumber: candidate.sectionNumber,
        heading,
        plainText: candidate.plainText ?? '',
      });
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const items: SearchItem[] = ranked.map((result) => ({
    section: result.sectionNumber,
    heading: result.heading,
    snippet: buildSnippet(result.plainText, query),
    url: buildUrl(result.sectionNumber),
  }));

  return NextResponse.json({ items });
};
