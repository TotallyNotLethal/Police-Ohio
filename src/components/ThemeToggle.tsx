'use client';

import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setDark((value) => !value)}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
      aria-label="Toggle theme"
    >
      {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {dark ? 'Dark' : 'Light'}
    </button>
  );
}
