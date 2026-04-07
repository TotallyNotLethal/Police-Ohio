import { notFound } from 'next/navigation';

import CacheButton from '../../../components/CacheButton';
import FavoriteButton from '../../../components/FavoriteButton';
import ReferenceDisclaimerBanner from '../../../components/ReferenceDisclaimerBanner';
import SectionDetailTabs from '../../../components/SectionDetailTabs';
import SectionHeader from '../../../components/SectionHeader';
import SectionActivityTracker from '../../../components/offline/SectionActivityTracker';
import SectionMetadata from '../../../components/SectionMetadata';
import { prisma } from '../../../lib/db/prisma';
import { canonicalUrlForSection, normalizeSectionNumber } from '../../../lib/orc/normalizer';

interface SectionPageProps {
  params: Promise<{
    sectionNumber: string;
  }>;
}

interface StatuteNode {
  marker: string;
  text: string;
  children?: StatuteNode[];
}

const formatTimestamp = (value?: Date | null) => {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value);
};

const buildOfficialBlocks = (bodyText: string): StatuteNode[] => {
  const lines = bodyText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks = lines.map((line, index) => {
    const markerMatch = line.match(/^\(([A-Za-z0-9]+)\)\s*(.+)$/);
    if (markerMatch) {
      return { marker: `(${markerMatch[1]})`, text: markerMatch[2] };
    }

    return { marker: `(${index + 1})`, text: line };
  });

  return blocks.length > 0 ? blocks : [{ marker: '(1)', text: 'Official statutory text unavailable.' }];
};

export default async function SectionPage({ params }: SectionPageProps) {
  const { sectionNumber } = await params;
  const normalizedSectionNumber = normalizeSectionNumber(sectionNumber);

  const section = await prisma.orcSection.findFirst({
    where: { sectionNumber: normalizedSectionNumber },
    include: {
      outboundRefs: {
        orderBy: { targetLabel: 'asc' },
        select: { targetLabel: true },
      },
    },
  });

  if (!section) {
    notFound();
  }

  const tags = (section.tags ?? {}) as Record<string, unknown>;
  const renderBlocks = (section.renderBlocks ?? {}) as Record<string, unknown>;

  const summary = typeof renderBlocks.summary === 'string' ? renderBlocks.summary : 'No app summary available.';
  const bodyText = section.bodyText?.trim() ?? '';
  const officialBlocks = buildOfficialBlocks(bodyText);

  return (
    <main className="space-y-6">
      <SectionActivityTracker sectionNumber={normalizedSectionNumber} />
      <SectionHeader sectionNumber={normalizedSectionNumber} title={section.heading} />
      <ReferenceDisclaimerBanner />
      <SectionMetadata
        officialSourceUrl={canonicalUrlForSection(normalizedSectionNumber)}
        authenticatedPdfUrl={typeof tags.pdfUrl === 'string' ? tags.pdfUrl : null}
        lastIngestedAt={formatTimestamp(section.ingestedAt)}
        effectiveDate={typeof tags.effectiveDate === 'string' ? tags.effectiveDate : null}
        latestLegislation={typeof tags.latestLegislation === 'string' ? tags.latestLegislation : null}
      />
      <div className="flex flex-wrap gap-2">
        <FavoriteButton sectionNumber={normalizedSectionNumber} />
        <CacheButton sectionNumber={normalizedSectionNumber} title={section.heading} />
      </div>
      <SectionDetailTabs
        summary={summary}
        references={section.outboundRefs.map((ref) => ref.targetLabel).filter((label): label is string => Boolean(label))}
        blocks={officialBlocks}
      />
    </main>
  );
}
