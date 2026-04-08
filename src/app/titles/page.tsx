import TitleCard from '../../components/TitleCard';
import { prisma } from '../../lib/db/prisma';
import { compareCodeNumbers } from '../../lib/orc/sort';

export default async function TitlesPage() {
  const titles = await prisma.orcTitle.findMany({
    select: {
      titleNumber: true,
      name: true,
      slug: true,
    },
  });

  const sortedTitles = [...titles].sort((a, b) => compareCodeNumbers(a.titleNumber, b.titleNumber));

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Titles</h1>
      {titles.length === 0 ? (
        <p className="text-sm text-slate-600">No title records found. Run ingestion/full rebuild to populate the database.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedTitles.map((title) => (
            <TitleCard key={title.slug} titleNumber={title.titleNumber} titleName={title.name} href={`/titles/${title.slug}`} />
          ))}
        </div>
      )}
    </main>
  );
}
