import Link from 'next/link';

interface SearchResultCardProps {
  title: string;
  excerpt: string;
  href: string;
}

export default function SearchResultCard({ title, excerpt, href }: SearchResultCardProps) {
  return (
    <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{excerpt}</p>
    </Link>
  );
}
