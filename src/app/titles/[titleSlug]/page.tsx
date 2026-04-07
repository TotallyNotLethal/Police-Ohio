import ChapterList from '../../../components/ChapterList';

interface TitleDetailPageProps {
  params: Promise<{
    titleSlug: string;
  }>;
}

export default async function TitleDetailPage({ params }: TitleDetailPageProps) {
  const { titleSlug } = await params;

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Title: {titleSlug}</h1>
      <ChapterList
        chapters={[
          { slug: '2901-general-provisions', number: '2901', title: 'General Provisions' },
          { slug: '2903-offenses', number: '2903', title: 'Offenses Against the Person' },
        ]}
      />
    </main>
  );
}
