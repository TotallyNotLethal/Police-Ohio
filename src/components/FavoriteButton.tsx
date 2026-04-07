'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { queueSync, setFavorite } from '../lib/offline/client-store';

interface FavoriteButtonProps {
  sectionNumber: string;
}

export default function FavoriteButton({ sectionNumber }: FavoriteButtonProps) {
  const [favorite, setFavoriteState] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFavorite() {
      try {
        const response = await fetch('/api/favorites', { cache: 'no-store' });
        const data = (await response.json()) as { favorites?: string[] };
        if (active) {
          setFavoriteState(Boolean(data.favorites?.includes(sectionNumber)));
        }
      } catch {
        // noop
      }
    }

    loadFavorite();
    return () => {
      active = false;
    };
  }, [sectionNumber]);

  async function toggleFavorite() {
    const next = !favorite;
    setFavoriteState(next);
    setSaving(true);

    try {
      await setFavorite(sectionNumber, next);
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionNumber, favorite: next }),
      });
      await queueSync();
    } catch {
      setFavoriteState(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700"
      aria-busy={saving}
    >
      <Star className={`h-4 w-4 ${favorite ? 'fill-amber-500 text-amber-500' : ''}`} />
      {saving ? 'Saving…' : favorite ? 'Favorited' : 'Add Favorite'}
    </button>
  );
}
