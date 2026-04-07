import { NextResponse } from 'next/server';

const favoriteSet = new Set<string>();

export async function GET() {
  return NextResponse.json({ favorites: [...favoriteSet] });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { sectionNumber?: string; favorite?: boolean };

  if (!body.sectionNumber || typeof body.favorite !== 'boolean') {
    return NextResponse.json({ error: 'sectionNumber and favorite are required' }, { status: 400 });
  }

  if (body.favorite) {
    favoriteSet.add(body.sectionNumber);
  } else {
    favoriteSet.delete(body.sectionNumber);
  }

  return NextResponse.json({ ok: true, favorites: [...favoriteSet] });
}
