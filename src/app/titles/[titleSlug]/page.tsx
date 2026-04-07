interface TitleDetailPageProps {
  params: Promise<{
    titleSlug: string;
  }>;
}

export default async function TitleDetailPage({ params }: TitleDetailPageProps) {
  const { titleSlug } = await params;

  return <main className="p-8">Title: {titleSlug}</main>;
}
