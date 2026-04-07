interface SectionPageProps {
  params: Promise<{
    sectionNumber: string;
  }>;
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { sectionNumber } = await params;

  return <main className="p-8">Section: {sectionNumber}</main>;
}
