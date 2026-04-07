'use client';

import { useState } from 'react';
import CrossReferenceList from './CrossReferenceList';
import StatuteBlockRenderer from './StatuteBlockRenderer';

interface StatuteNode {
  marker: string;
  text: string;
  children?: StatuteNode[];
}

interface SectionDetailTabsProps {
  blocks: StatuteNode[];
  summary: string;
  references: string[];
}

const tabs = ['Official Text', 'Summary', 'Cross References'] as const;
type TabLabel = (typeof tabs)[number];

export default function SectionDetailTabs({ blocks, summary, references }: SectionDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabLabel>('Official Text');

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Official Text' ? <StatuteBlockRenderer blocks={blocks} /> : null}

      {activeTab === 'Summary' ? (
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">App Summary - Not Official Statutory Text</p>
          <p className="mt-2 text-sm text-amber-900">{summary}</p>
        </article>
      ) : null}

      {activeTab === 'Cross References' ? (
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <CrossReferenceList references={references} />
        </article>
      ) : null}
    </section>
  );
}
