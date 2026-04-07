import Link from 'next/link';

interface TitleCardProps {
  titleNumber: string;
  titleName: string;
  href: string;
}

export default function TitleCard({ titleNumber, titleName, href }: TitleCardProps) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title {titleNumber}</p>
      <h3 className="mt-1 font-semibold text-slate-900">{titleName}</h3>
    </Link>
  );
}
