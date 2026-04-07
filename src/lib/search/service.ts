import { prisma } from '../db/prisma';

import { parseSearchQuery } from './query';
import { buildSnippet, rankSection } from './ranking';
import type { SearchRequest, SearchResponse, SearchableSection } from './types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const runSearch = async (request: SearchRequest): Promise<SearchResponse> => {
  const parsedQuery = parseSearchQuery(request.query ?? '');
  const filters = request.filters ?? {};

  if (!parsedQuery.normalized) {
    return { query: request.query, normalizedQuery: '', total: 0, results: [] };
  }

  const where = {
    ...(filters.title ? { title: { titleNumber: filters.title } } : {}),
    ...(filters.chapter ? { chapter: { chapterNumber: filters.chapter } } : {}),
    ...(filters.favoritesOnly && filters.userId
      ? {
          favorites: {
            some: {
              userId: filters.userId,
            },
          },
        }
      : {}),
  };

  const sections = await prisma.orcSection.findMany({
    where,
    include: {
      title: { select: { titleNumber: true, name: true } },
      chapter: { select: { chapterNumber: true, name: true } },
      favorites: filters.userId ? { where: { userId: filters.userId }, select: { id: true } } : false,
    },
    take: MAX_LIMIT,
  });

  const recentSectionIds =
    filters.recentOnly || filters.userId
      ? new Set(
          (
            await prisma.searchHistory.findMany({
              where: filters.userId ? { userId: filters.userId } : undefined,
              select: { resultMeta: true },
              orderBy: { createdAt: 'desc' },
              take: 50,
            })
          )
            .flatMap((history) => {
              const meta = (history.resultMeta ?? {}) as { sectionIds?: string[] };
              return meta.sectionIds ?? [];
            })
            .filter(Boolean),
        )
      : new Set<string>();

  const searchable: SearchableSection[] = sections.map((section) => ({
    id: section.id,
    sectionNumber: section.sectionNumber,
    heading: section.heading,
    bodyText: section.bodyText,
    aliases: section.aliases,
    tags: section.tags,
    titleNumber: section.title.titleNumber,
    titleName: section.title.name,
    chapterNumber: section.chapter.chapterNumber,
    chapterName: section.chapter.name,
    isFavorite: Array.isArray(section.favorites) && section.favorites.length > 0,
    isRecent: recentSectionIds.has(section.id),
  }));

  const ranked = searchable
    .map((section) => {
      const { score, matchedSignals } = rankSection(section, parsedQuery);
      return {
        ...section,
        score,
        matchedSignals,
      };
    })
    .filter((item) => item.score > 0)
    .filter((item) => (filters.recentOnly ? item.isRecent : true))
    .sort((a, b) => b.score - a.score || a.sectionNumber.localeCompare(b.sectionNumber));

  const limited = ranked.slice(0, Math.min(MAX_LIMIT, Math.max(1, request.limit ?? DEFAULT_LIMIT)));

  return {
    query: request.query,
    normalizedQuery: parsedQuery.normalized,
    total: ranked.length,
    results: limited.map((item) => {
      const tags = (item.tags ?? {}) as Record<string, unknown>;
      const effectiveDate = typeof tags.effectiveDate === 'string' ? tags.effectiveDate : null;

      return {
        sectionId: item.id,
        sectionNumber: item.sectionNumber,
        heading: item.heading,
        snippet: buildSnippet(item.bodyText ?? '', [...parsedQuery.terms, ...parsedQuery.phrases]),
        effectiveDate,
        titleLabel: `Title ${item.titleNumber}: ${item.titleName}`,
        chapterLabel: `Chapter ${item.chapterNumber}: ${item.chapterName}`,
        score: item.score,
        sourceUrl: `https://codes.ohio.gov/ohio-revised-code/section-${item.sectionNumber}`,
        isFavorite: item.isFavorite,
        isRecent: item.isRecent,
        matchedSignals: item.matchedSignals,
      };
    }),
  };
};
