const defaultFilters = ['Traffic', 'Arrest', 'Domestic', 'Weapons', 'Records'];

export default function QuickFilters() {
  return (
    <div className="flex flex-wrap gap-2">
      {defaultFilters.map((filter) => (
        <button key={filter} type="button" className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          {filter}
        </button>
      ))}
    </div>
  );
}
