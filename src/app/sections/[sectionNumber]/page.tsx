import CacheButton from '../../../components/CacheButton';
import FavoriteButton from '../../../components/FavoriteButton';
import SectionDetailTabs from '../../../components/SectionDetailTabs';
import SectionHeader from '../../../components/SectionHeader';
import SectionMetadata from '../../../components/SectionMetadata';

interface SectionPageProps {
  params: Promise<{
    sectionNumber: string;
  }>;
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { sectionNumber } = await params;

  return (
    <main className="space-y-6">
      <SectionHeader sectionNumber={sectionNumber} title="Statutory Section Detail" />
      <SectionMetadata enacted="January 1, 1974" updated="March 20, 2026" source="Ohio Revised Code" />
      <div className="flex flex-wrap gap-2">
        <FavoriteButton />
        <CacheButton />
      </div>
      <SectionDetailTabs
        summary="This section outlines prohibited conduct, exceptions, and enforcement conditions relevant to the designated offense category."
        references={['2901.01', '2901.02', '2923.12']}
        blocks={[
          {
            marker: '(A)',
            text: 'No person shall knowingly engage in the prohibited conduct described in this section.',
            children: [
              {
                marker: '(1)',
                text: 'Applies when conduct is directed toward a protected person.',
                children: [
                  {
                    marker: '(a)',
                    text: 'Includes direct acts and attempts to cause physical harm.',
                    children: [{ marker: '(i)', text: 'Evidence may include witness statements and visible injury.' }],
                  },
                ],
              },
            ],
          },
          { marker: '(B)', text: 'Whoever violates this section is subject to penalties under related chapters.' },
        ]}
      />
    </main>
  );
}
