'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

export default function FavoriteButton() {
  const [favorite, setFavorite] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFavorite((value) => !value)}
      className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700"
    >
      <Star className={`h-4 w-4 ${favorite ? 'fill-amber-500 text-amber-500' : ''}`} />
      {favorite ? 'Favorited' : 'Add Favorite'}
    </button>
  );
}
