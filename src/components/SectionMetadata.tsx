import Link from 'next/link';

interface SectionMetadataProps {
  officialSourceUrl: string;
  authenticatedPdfUrl?: string | null;
  lastIngestedAt?: string | null;
  effectiveDate?: string | null;
  latestLegislation?: string | null;
}

const valueOrFallback = (value?: string | null, fallback = 'Not available') => value ?? fallback;

export default function SectionMetadata({
  officialSourceUrl,
  authenticatedPdfUrl,
  lastIngestedAt,
  effectiveDate,
  latestLegislation,
}: SectionMetadataProps) {
  return (
    <dl className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="font-semibold text-slate-500">Official Source</dt>
        <dd>
          <Link href={officialSourceUrl} className="text-blue-700 hover:underline" target="_blank" rel="noreferrer">
            codes.ohio.gov section page
          </Link>
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-500">Authenticated PDF</dt>
        <dd>
          {authenticatedPdfUrl ? (
            <Link href={authenticatedPdfUrl} className="text-blue-700 hover:underline" target="_blank" rel="noreferrer">
              Open authenticated PDF
            </Link>
          ) : (
            <span className="text-slate-600">Not available</span>
          )}
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-500">Last Ingested</dt>
        <dd>{valueOrFallback(lastIngestedAt)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-500">Effective Date</dt>
        <dd>{valueOrFallback(effectiveDate)}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="font-semibold text-slate-500">Latest Legislation</dt>
        <dd>{valueOrFallback(latestLegislation)}</dd>
      </div>
    </dl>
  );
}
