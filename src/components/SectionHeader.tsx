interface SectionHeaderProps {
  sectionNumber: string;
  title: string;
}

export default function SectionHeader({ sectionNumber, title }: SectionHeaderProps) {
  return (
    <header className="space-y-1">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Section {sectionNumber}</p>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
    </header>
  );
}
