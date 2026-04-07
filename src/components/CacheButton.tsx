'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

export default function CacheButton() {
  const [cached, setCached] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setCached(true)}
      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
    >
      <Download className="h-4 w-4" />
      {cached ? 'Available Offline' : 'Cache for Offline'}
    </button>
  );
}
