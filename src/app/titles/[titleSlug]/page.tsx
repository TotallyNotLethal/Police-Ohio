import { notFound } from 'next/navigation';

import ChapterList from '../../../components/ChapterList';
import { prisma } from '../../../lib/db/prisma';

interface TitleDetailPageProps {
  params: Promise<{
    titleSlug: string;
  }>;
}

export default async function TitleDetailPage({ params }: TitleDetailPageProps) {
  const { titleSlug } = await params;

  const title = await prisma.orcTitle.findUnique({
    where: { slug: titleSlug },
    select: {
      titleNumber: true,
      name: true,
      chapters: {
        select: {
          slug: true,
          chapterNumber: true,
          name: true,
        },
        orderBy: { chapterNumber: 'asc' },
      },
    },
  });

  if (!title) {
    notFound();
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">
        Title {title.titleNumber}: {title.name}
      </h1>
      <ChapterList
        chapters={title.chapters.map((chapter) => ({
          slug: chapter.slug,
          number: chapter.chapterNumber,
          title: chapter.name,
        }))}
      />
    </main>
  );
}
