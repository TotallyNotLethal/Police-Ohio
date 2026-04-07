import { Search } from 'lucide-react';

interface GlobalSearchBarProps {
  placeholder?: string;
}

export default function GlobalSearchBar({ placeholder = 'Search Ohio statutes, chapters, or topics…' }: GlobalSearchBarProps) {
  return (
    <label className="flex w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
      <Search className="h-4 w-4 text-slate-500" />
      <input
        type="search"
        placeholder={placeholder}
        className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
      />
    </label>
  );
}
