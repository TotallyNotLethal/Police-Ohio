interface SectionMetadataProps {
  enacted: string;
  updated: string;
  source: string;
}

export default function SectionMetadata({ enacted, updated, source }: SectionMetadataProps) {
  return (
    <dl className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
      <div><dt className="font-semibold text-slate-500">Enacted</dt><dd>{enacted}</dd></div>
      <div><dt className="font-semibold text-slate-500">Last Updated</dt><dd>{updated}</dd></div>
      <div><dt className="font-semibold text-slate-500">Source</dt><dd>{source}</dd></div>
    </dl>
  );
}
