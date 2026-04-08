function LoadingCard({ index }: { index: number }) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function TitlesLoading() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Titles</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 12 }, (_, index) => (
          <LoadingCard index={index} key={index} />
        ))}
      </div>
    </main>
  );
}
