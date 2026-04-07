export type SearchFilters = {
  title?: string;
  chapter?: string;
  favoritesOnly?: boolean;
  recentOnly?: boolean;
  userId?: string;
};

export type SearchRequest = {
  query: string;
  limit?: number;
  filters?: SearchFilters;
};

export type SearchResult = {
  sectionId: string;
  sectionNumber: string;
  heading: string;
  snippet: string;
  effectiveDate: string | null;
  titleLabel: string;
  chapterLabel: string;
  score: number;
  sourceUrl: string;
  isFavorite: boolean;
  isRecent: boolean;
  matchedSignals: string[];
};

export type SearchResponse = {
  query: string;
  normalizedQuery: string;
  total: number;
  results: SearchResult[];
};

export type SearchableSection = {
  id: string;
  sectionNumber: string;
  heading: string;
  bodyText: string | null;
  aliases: unknown;
  tags: unknown;
  titleNumber: string;
  titleName: string;
  chapterNumber: string;
  chapterName: string;
  isFavorite: boolean;
  isRecent: boolean;
};
