import Link from 'next/link';

interface ChapterItem {
  slug: string;
  number: string;
  title: string;
}

interface ChapterListProps {
  chapters: ChapterItem[];
}

export default function ChapterList({ chapters }: ChapterListProps) {
  return (
    <ul className="space-y-2">
      {chapters.map((chapter) => (
        <li key={chapter.slug}>
          <Link href={`/chapters/${chapter.slug}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300">
            <span className="font-medium text-slate-900">Chapter {chapter.number}</span>
            <span className="text-slate-600">{chapter.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
