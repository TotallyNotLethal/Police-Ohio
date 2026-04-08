import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';

export default async function Page() {
  const [titleCount, chapterCount, sectionCount, recentSections] = await Promise.all([
    prisma.orcTitle.count(),
    prisma.orcChapter.count(),
    prisma.orcSection.count(),
    prisma.orcSection.findMany({
      select: {
        sectionNumber: true,
        heading: true,
        chapter: { select: { chapterNumber: true } },
      },
      orderBy: [{ ingestedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 10,
    }),
  ]);

  return (
    <main className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Ohio Revised Code</h1>
        <p className="mt-2 text-sm text-slate-600">
          Content is loaded from the local database populated by ingestion scripts (including full rebuild).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Titles</p>
            <p className="text-2xl font-semibold">{titleCount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Chapters</p>
            <p className="text-2xl font-semibold">{chapterCount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Sections</p>
            <p className="text-2xl font-semibold">{sectionCount.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/titles" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Browse titles
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recently ingested sections</h2>
        {recentSections.length === 0 ? (
          <p className="text-sm text-slate-600">No sections are in the database yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentSections.map((section) => (
              <li key={section.sectionNumber}>
                <Link
                  href={`/sections/${section.sectionNumber}`}
                  className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
                >
                  <span className="font-medium text-slate-900">§ {section.sectionNumber}</span>
                  <span className="ml-3 flex-1 text-right text-slate-600">{section.heading || `Chapter ${section.chapter.chapterNumber}`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
