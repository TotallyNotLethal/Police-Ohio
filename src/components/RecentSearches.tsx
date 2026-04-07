import Link from 'next/link';

interface RecentSearchesProps {
  queries: string[];
}

export default function RecentSearches({ queries }: RecentSearchesProps) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">Recent Searches</h2>
      <ul className="space-y-1 text-sm text-slate-600">
        {queries.map((query) => (
          <li key={query}>
            <Link href={`/search?q=${encodeURIComponent(query)}`} className="hover:underline">
              {query}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
