import { NextRequest, NextResponse } from 'next/server';

import { runSingleSectionIngestion } from '../../../../lib/admin/legal-content-ops';

export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json()) as { sectionNumber?: string };
    if (!body.sectionNumber) {
      return NextResponse.json({ error: 'sectionNumber is required' }, { status: 400 });
    }

    const result = await runSingleSectionIngestion(body.sectionNumber);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[api/admin/ingest] failed', error);
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 });
  }
};
