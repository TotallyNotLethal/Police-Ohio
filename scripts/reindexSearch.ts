import { mkdir, writeFile } from 'node:fs/promises';
import type { Prisma } from '@prisma/client';

import { prisma } from '../src/lib/db/prisma';
import { buildSearchDocument } from '../src/lib/orc/indexer';

const OUTPUT_PATH = 'scripts/.artifacts/search-index.json';
type SearchSectionRow = Prisma.OrcSectionGetPayload<{
  select: {
    id: true;
    sectionNumber: true;
    heading: true;
    bodyText: true;
    tags: true;
  };
}>;

const run = async () => {
  const sections: SearchSectionRow[] = await prisma.orcSection.findMany({
    select: {
      id: true,
      sectionNumber: true,
      heading: true,
      bodyText: true,
      tags: true,
    },
  });

  const docs = sections.map((section: SearchSectionRow) => {
    const meta = (section.tags ?? {}) as Record<string, string | undefined>;

    return buildSearchDocument({
      sectionId: section.id,
      sectionNumber: section.sectionNumber,
      heading: section.heading,
      rawOfficialText: section.bodyText ?? '',
      effectiveDate: meta.effectiveDate,
      latestLegislation: meta.latestLegislation,
    });
  });

  await mkdir('scripts/.artifacts', { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(docs, null, 2));
  console.log(`[reindexSearch] wrote ${docs.length} documents to ${OUTPUT_PATH}`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
