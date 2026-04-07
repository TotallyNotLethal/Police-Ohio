'use client';

import { useEffect } from 'react';
import { addRecentView, queueSync } from '../../lib/offline/client-store';

interface SectionActivityTrackerProps {
  sectionNumber: string;
}

export default function SectionActivityTracker({ sectionNumber }: SectionActivityTrackerProps) {
  useEffect(() => {
    addRecentView(sectionNumber)
      .then(() => queueSync())
      .catch(() => null);
  }, [sectionNumber]);

  return null;
}
