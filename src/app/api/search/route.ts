import { NextRequest, NextResponse } from 'next/server';

import { runSearch } from '../../../lib/search';
import type { SearchRequest, SearchResponse } from '../../../lib/search';

export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json()) as Partial<SearchRequest>;

    if (typeof body.query !== 'string') {
      return NextResponse.json({ error: 'query must be a string' }, { status: 400 });
    }

    const payload: SearchRequest = {
      query: body.query,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      filters: body.filters,
    };

    const response: SearchResponse = await runSearch(payload);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[api/search] failed', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
};
