'use client';

import { useState } from 'react';

export default function ReindexButton() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const onReindex = async () => {
    setLoading(true);
    setStatus('Running reindex...');

    try {
      const response = await fetch('/api/admin/reindex', { method: 'POST' });
      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error ?? 'Reindex failed');
      } else {
        setStatus(`Reindex complete. Coverage ${payload.result.coverage}%`);
      }
    } catch {
      setStatus('Reindex request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onReindex}
        disabled={loading}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {loading ? 'Reindexing…' : 'Reindex Search'}
      </button>
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </div>
  );
}
