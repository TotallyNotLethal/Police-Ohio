'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listRecentViews, type RecentView } from '../../lib/offline/client-store';

export default function RecentPage() {
  const [recent, setRecent] = useState<RecentView[]>([]);

  useEffect(() => {
    listRecentViews().then((items) => setRecent(items.slice(0, 20))).catch(() => null);
  }, []);

  return (
    <main className="space-y-4 p-2">
      <h1 className="text-2xl font-semibold text-slate-900">Recent Views</h1>
      {recent.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">No recent sections yet.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((item) => (
            <li key={item.sectionNumber} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <Link className="font-semibold text-emerald-700 hover:underline" href={`/sections/${item.sectionNumber}`}>
                  Section {item.sectionNumber}
                </Link>
                <span className="text-xs text-slate-500">{new Date(item.viewedAt).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
