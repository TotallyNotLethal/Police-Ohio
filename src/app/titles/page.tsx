import TitleCard from '../../components/TitleCard';
import { prisma } from '../../lib/db/prisma';

export default async function TitlesPage() {
  const titles = await prisma.orcTitle.findMany({
    select: {
      titleNumber: true,
      name: true,
      slug: true,
    },
    orderBy: { titleNumber: 'asc' },
  });

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Titles</h1>
      {titles.length === 0 ? (
        <p className="text-sm text-slate-600">No title records found. Run ingestion/full rebuild to populate the database.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {titles.map((title) => (
            <TitleCard key={title.slug} titleNumber={title.titleNumber} titleName={title.name} href={`/titles/${title.slug}`} />
          ))}
        </div>
      )}
    </main>
  );
}
