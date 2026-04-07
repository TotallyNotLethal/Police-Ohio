'use client';

import { Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cacheSection, listCachedSections, queueSync } from '../lib/offline/client-store';

interface CacheButtonProps {
  sectionNumber: string;
  title: string;
}

export default function CacheButton({ sectionNumber, title }: CacheButtonProps) {
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCachedSections()
      .then((items) => {
        const entry = items.find((item) => item.sectionNumber === sectionNumber);
        if (entry) setCachedAt(entry.cachedAt);
      })
      .catch(() => null);
  }, [sectionNumber]);

  async function refreshCache() {
    setSaving(true);
    try {
      await cacheSection(sectionNumber, title);
      setCachedAt(Date.now());
      await queueSync();
    } finally {
      setSaving(false);
    }
  }

  const isCached = Boolean(cachedAt);

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={refreshCache}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
        aria-busy={saving}
      >
        {isCached ? <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} /> : <Download className="h-4 w-4" />}
        {saving ? 'Refreshing…' : isCached ? 'Refresh Cache' : 'Cache for Offline'}
      </button>
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isCached ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
        {isCached ? 'Cached' : 'Not Cached'}
      </span>
    </div>
  );
}
