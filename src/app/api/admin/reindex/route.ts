import { NextResponse } from 'next/server';

import { runSearchReindex } from '../../../../lib/admin/legal-content-ops';

export const POST = async () => {
  try {
    const result = await runSearchReindex();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[api/admin/reindex] failed', error);
    return NextResponse.json({ error: 'Reindex failed' }, { status: 500 });
  }
};
