import QuickFilters from '../components/QuickFilters';
import RecentSearches from '../components/RecentSearches';
import SearchResultCard from '../components/SearchResultCard';

export default function HomePage() {
  return (
    <main className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">Ohio Statutory Explorer</h1>
        <p className="text-slate-600">Use search, quick filters, and navigational links to jump between titles, chapters, and statute sections.</p>
        <QuickFilters />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SearchResultCard title="2901.01 General Definitions" excerpt="Defines key terms used throughout criminal code chapters." href="/sections/2901.01" />
        <SearchResultCard title="2903.13 Assault" excerpt="Covers assault offenses and related penalties." href="/sections/2903.13" />
      </section>

      <RecentSearches queries={['domestic violence', 'weapons under disability', 'arrest warrant']} />
    </main>
  );
}
