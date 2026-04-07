import ReindexButton from '../../components/admin/ReindexButton';
import { prisma } from '../../lib/db/prisma';

export const dynamic = 'force-dynamic';

const formatTimestamp = (value: Date | null | undefined) => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value);
};

export default async function AdminPage() {
  const [
    latestRun,
    latestParseFailures,
    latestWarnings,
    latestChanges,
    latestMetadataIssues,
    sectionCount,
    indexedCount,
    lastSyncSection,
  ] = await Promise.all([
    prisma.ingestionRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.parseFailureLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.parserWarningLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.changedStatute.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.missingMetadataLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.orcSection.count(),
    prisma.orcSection.count({ where: { bodyText: { not: null } } }),
    prisma.orcSection.findFirst({ orderBy: { ingestedAt: 'desc' }, select: { ingestedAt: true } }),
  ]);

  const indexCoverage = sectionCount === 0 ? 0 : Math.round((indexedCount / sectionCount) * 100);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Legal Content Operations</h1>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Ingestion status</h2>
          <dl className="mt-3 space-y-1 text-sm text-slate-700">
            <div className="flex justify-between"><dt>Status</dt><dd>{latestRun?.status ?? 'No runs yet'}</dd></div>
            <div className="flex justify-between"><dt>Last run start</dt><dd>{formatTimestamp(latestRun?.startedAt)}</dd></div>
            <div className="flex justify-between"><dt>Ingested</dt><dd>{latestRun?.ingestedCount ?? 0}</dd></div>
            <div className="flex justify-between"><dt>Changed statutes</dt><dd>{latestRun?.changedCount ?? 0}</dd></div>
            <div className="flex justify-between"><dt>Parse failures</dt><dd>{latestRun?.parseFailureCount ?? 0}</dd></div>
            <div className="flex justify-between"><dt>Missing metadata</dt><dd>{latestRun?.missingMetadataCount ?? 0}</dd></div>
          </dl>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Search index health</h2>
          <dl className="mt-3 space-y-1 text-sm text-slate-700">
            <div className="flex justify-between"><dt>Total statutes</dt><dd>{sectionCount}</dd></div>
            <div className="flex justify-between"><dt>Indexed statutes</dt><dd>{indexedCount}</dd></div>
            <div className="flex justify-between"><dt>Coverage</dt><dd>{indexCoverage}%</dd></div>
            <div className="flex justify-between"><dt>Last sync timestamp</dt><dd>{formatTimestamp(lastSyncSection?.ingestedAt)}</dd></div>
          </dl>
          <div className="mt-3">
            <ReindexButton />
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Crawl / parse errors</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {latestParseFailures.length === 0 ? <li>No parse failures logged.</li> : null}
            {latestParseFailures.map((failure) => (
              <li key={failure.id} className="rounded bg-slate-50 px-3 py-2">
                <div className="font-medium">{failure.sectionNumber ?? 'unknown section'}</div>
                <div>{failure.errorMessage}</div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Parser low-confidence warnings</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {latestWarnings.length === 0 ? <li>No parser warnings logged.</li> : null}
            {latestWarnings.map((warning) => (
              <li key={warning.id} className="rounded bg-slate-50 px-3 py-2">
                <div className="font-medium">{warning.sectionNumber} · {warning.code}</div>
                <div>{warning.message}</div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Changed statutes / version diff</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {latestChanges.length === 0 ? <li>No changed statutes tracked yet.</li> : null}
            {latestChanges.map((change) => (
              <li key={change.id} className="rounded bg-slate-50 px-3 py-2">
                <div className="font-medium">{change.sectionNumber}</div>
                <div>{change.diffSummary ?? 'No diff summary.'}</div>
                <div className="text-xs text-slate-500">{change.oldHash?.slice(0, 8) ?? 'new'} → {change.newHash.slice(0, 8)}</div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Missing metadata</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {latestMetadataIssues.length === 0 ? <li>No missing metadata issues logged.</li> : null}
            {latestMetadataIssues.map((issue) => (
              <li key={issue.id} className="rounded bg-slate-50 px-3 py-2">
                <div className="font-medium">{issue.sectionNumber}</div>
                <div>Missing fields: {JSON.stringify(issue.missingFields)}</div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
