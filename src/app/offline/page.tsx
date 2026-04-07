'use client';

import { useEffect, useState } from 'react';
import { listCachedSections, queueSync, type CachedSection } from '../../lib/offline/client-store';

export default function OfflinePage() {
  const [cachedSections, setCachedSections] = useState<CachedSection[]>([]);
  const [syncing, setSyncing] = useState(false);

  async function refreshState() {
    const sections = await listCachedSections();
    setCachedSections(sections);
  }

  useEffect(() => {
    refreshState().catch(() => null);
  }, []);

  async function triggerSync() {
    setSyncing(true);
    try {
      await queueSync();
      await refreshState();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="space-y-4 p-2">
      <h1 className="text-2xl font-semibold text-slate-900">Offline & Sync</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        Cached sections: <span className="font-semibold">{cachedSections.length}</span>
      </div>
      <button
        type="button"
        onClick={triggerSync}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        aria-busy={syncing}
      >
        {syncing ? 'Syncing…' : 'Refresh cache + sync now'}
      </button>
      <ul className="space-y-2">
        {cachedSections.map((item) => (
          <li key={item.sectionNumber} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <p className="font-semibold">Section {item.sectionNumber}</p>
            <p className="text-xs text-slate-500">{item.title}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
