'use client';

import { useId, useState } from 'react';
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
  const baseId = useId();

  return (
    <section className="space-y-4" aria-label="Statute detail content sections">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Statute detail tabs">
        {tabs.map((tab) => {
          const tabId = `${baseId}-${tab.replace(/\s+/g, '-').toLowerCase()}-tab`;
          const panelId = `${baseId}-${tab.replace(/\s+/g, '-').toLowerCase()}-panel`;
          return (
            <button
              key={tab}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={panelId}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {activeTab === 'Official Text' ? (
        <article id={`${baseId}-official-text-panel`} role="tabpanel" aria-labelledby={`${baseId}-official-text-tab`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Official Statutory Text</p>
          <StatuteBlockRenderer blocks={blocks} />
        </article>
      ) : null}

      {activeTab === 'Summary' ? (
        <article
          id={`${baseId}-summary-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-summary-tab`}
          className="rounded-xl border border-amber-300 bg-amber-50 p-4"
        >
          <p className="text-sm font-bold text-amber-800">App Summary (Reference Only)</p>
          <p className="mt-2 text-sm text-amber-900">{summary}</p>
        </article>
      ) : null}

      {activeTab === 'Cross References' ? (
        <article
          id={`${baseId}-cross-references-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-cross-references-tab`}
          className="rounded-xl border border-blue-200 bg-blue-50 p-4"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">Cross References</p>
          <CrossReferenceList references={references} />
        </article>
      ) : null}
    </section>
  );
}
