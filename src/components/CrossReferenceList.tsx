import Link from 'next/link';

interface CrossReferenceListProps {
  references: string[];
}

export default function CrossReferenceList({ references }: CrossReferenceListProps) {
  if (!references.length) {
    return <p className="text-sm text-slate-500">No cross references listed.</p>;
  }

  return (
    <ul className="space-y-2">
      {references.map((reference) => (
        <li key={reference}>
          <Link href={`/sections/${reference}`} className="text-sm font-medium text-blue-700 hover:underline">
            {reference}
          </Link>
        </li>
      ))}
    </ul>
  );
}
