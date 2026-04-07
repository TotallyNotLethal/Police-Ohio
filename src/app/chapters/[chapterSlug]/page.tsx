interface ChapterPageProps {
  params: Promise<{
    chapterSlug: string;
  }>;
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { chapterSlug } = await params;

  return <main className="p-8">Chapter: {chapterSlug}</main>;
}
