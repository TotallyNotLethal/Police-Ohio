import Link from 'next/link';
import { notFound } from 'next/navigation';

import { prisma } from '../../../lib/db/prisma';

interface ChapterPageProps {
  params: Promise<{
    chapterSlug: string;
  }>;
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { chapterSlug } = await params;

  const chapter = await prisma.orcChapter.findFirst({
    where: { slug: chapterSlug },
    select: {
      chapterNumber: true,
      name: true,
      title: {
        select: {
          titleNumber: true,
          name: true,
          slug: true,
        },
      },
      sections: {
        select: {
          sectionNumber: true,
          heading: true,
          slug: true,
        },
        orderBy: { sectionNumber: 'asc' },
      },
    },
    orderBy: { chapterNumber: 'asc' },
  });

  if (!chapter) {
    notFound();
  }

  return (
    <main className="space-y-4">
      <p className="text-sm text-slate-600">
        <Link href={`/titles/${chapter.title.slug}`} className="underline-offset-2 hover:underline">
          Title {chapter.title.titleNumber}: {chapter.title.name}
        </Link>
      </p>
      <h1 className="text-2xl font-bold">
        Chapter {chapter.chapterNumber}: {chapter.name}
      </h1>

      {chapter.sections.length === 0 ? (
        <p className="text-sm text-slate-600">No sections found for this chapter.</p>
      ) : (
        <ul className="space-y-2">
          {chapter.sections.map((section) => (
            <li key={section.slug}>
              <Link
                href={`/sections/${section.sectionNumber}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300"
              >
                <span className="font-medium text-slate-900">§ {section.sectionNumber}</span>
                <span className="ml-4 text-right text-slate-600">{section.heading}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
