import TitleCard from '../../components/TitleCard';

const titles = [
  { titleNumber: 'XXIX', titleName: 'Crimes Procedure', href: '/titles/crimes-procedure' },
  { titleNumber: 'IX', titleName: 'Agriculture', href: '/titles/agriculture' },
];

export default function TitlesPage() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Titles</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {titles.map((title) => (
          <TitleCard key={title.href} {...title} />
        ))}
      </div>
    </main>
  );
}
