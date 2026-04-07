import { prisma } from '../src/lib/db/prisma';
import { OrcCrawler, sectionUrl } from '../src/lib/orc/crawler';
import { detectChange } from '../src/lib/orc/change-detector';
import { persistParsedSection } from '../src/lib/orc/indexer';
import { deriveTaxonomyFromSection, normalizeSectionNumber } from '../src/lib/orc/normalizer';
import { parseOrcSectionHtml } from '../src/lib/orc/parser';
import { extractCrossReferences } from '../src/lib/orc/references';

const run = async () => {
  const rawSectionNumber = process.argv[2];
  if (!rawSectionNumber) {
    throw new Error('Usage: tsx scripts/ingestSection.ts <sectionNumber>');
  }

  const sectionNumber = normalizeSectionNumber(rawSectionNumber);
  const taxonomy = deriveTaxonomyFromSection(sectionNumber);

  const crawler = new OrcCrawler({ logger: console.log });
  const response = await crawler.fetchHtml(sectionUrl(sectionNumber), { id: `section-${sectionNumber}` });

  if (!response) {
    throw new Error(`Could not fetch section ${sectionNumber}`);
  }

  const parsed = parseOrcSectionHtml(response.html);
  parsed.sectionNumber = parsed.sectionNumber || sectionNumber;

  const existing = await prisma.orcSection.findFirst({
    where: {
      sectionNumber: parsed.sectionNumber,
      chapter: { chapterNumber: taxonomy.chapterNumber },
    },
    select: { sourceHash: true },
  });

  const changed = detectChange(existing?.sourceHash, parsed.rawOfficialText);
  if (!changed.changed) {
    console.log(`[ingestSection] unchanged section ${parsed.sectionNumber}; skipping persistence`);
    return;
  }

  const references = extractCrossReferences(parsed.rawOfficialText);

  const section = await persistParsedSection({
    prisma,
    parsed,
    sourceHash: changed.hash,
    titleNumber: taxonomy.titleNumber,
    chapterNumber: taxonomy.chapterNumber,
    references,
  });

  console.log(
    JSON.stringify(
      {
        id: section.id,
        sectionNumber: parsed.sectionNumber,
        warnings: parsed.warnings,
        references: references.length,
        metadata: {
          effectiveDate: parsed.effectiveDate,
          latestLegislation: parsed.latestLegislation,
          pdfUrl: parsed.pdfUrl,
        },
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
