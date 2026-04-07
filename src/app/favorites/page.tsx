'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listFavorites } from '../../lib/offline/client-store';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    listFavorites().then(setFavorites).catch(() => null);
  }, []);

  return (
    <main className="space-y-4 p-2">
      <h1 className="text-2xl font-semibold text-slate-900">Favorites</h1>
      {favorites.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">No favorites saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {favorites.map((sectionNumber) => (
            <li key={sectionNumber} className="rounded-lg border border-slate-200 bg-white p-4">
              <Link className="text-sm font-semibold text-emerald-700 hover:underline" href={`/sections/${sectionNumber}`}>
                Section {sectionNumber}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
