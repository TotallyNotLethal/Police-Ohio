import { prisma } from '../src/lib/db/prisma';
import { CODES_OHIO_BASE_URL, OrcCrawler } from '../src/lib/orc/crawler';
import { detectChange } from '../src/lib/orc/change-detector';
import { persistParsedSection } from '../src/lib/orc/indexer';
import { deriveTaxonomyFromSection, normalizeSectionNumber } from '../src/lib/orc/normalizer';
import { parseOrcSectionHtml } from '../src/lib/orc/parser';
import { extractCrossReferences } from '../src/lib/orc/references';

const SECTION_LINK_REGEX = /href=["']([^"']*\/section-([\d.\-A-Za-z]+))["']/gi;

const run = async () => {
  const crawler = new OrcCrawler({ logger: console.log, minDelayMs: 900, maxRetries: 5 });
  const landing = await crawler.fetchHtml(CODES_OHIO_BASE_URL, { id: 'root' });

  if (!landing) {
    throw new Error('Unable to fetch codes.ohio.gov landing page');
  }

  const sectionNumbers = new Set<string>();
  for (const match of landing.html.matchAll(SECTION_LINK_REGEX)) {
    sectionNumbers.add(normalizeSectionNumber(match[2]));
  }

  const results = {
    visited: 0,
    ingested: 0,
    skippedUnchanged: 0,
    failed: 0,
    warnings: 0,
  };

  for (const sectionNumber of sectionNumbers) {
    results.visited += 1;

    try {
      const response = await crawler.fetchHtml(`https://codes.ohio.gov/ohio-revised-code/section-${sectionNumber}`, {
        id: `section-${sectionNumber}`,
      });

      if (!response) {
        continue;
      }

      const parsed = parseOrcSectionHtml(response.html);
      parsed.sectionNumber = parsed.sectionNumber || sectionNumber;

      const taxonomy = deriveTaxonomyFromSection(parsed.sectionNumber);
      const existing = await prisma.orcSection.findFirst({
        where: {
          sectionNumber: parsed.sectionNumber,
          chapter: { chapterNumber: taxonomy.chapterNumber },
        },
        select: { sourceHash: true },
      });

      const changed = detectChange(existing?.sourceHash, parsed.rawOfficialText);
      if (!changed.changed) {
        results.skippedUnchanged += 1;
        continue;
      }

      await persistParsedSection({
        prisma,
        parsed,
        sourceHash: changed.hash,
        titleNumber: taxonomy.titleNumber,
        chapterNumber: taxonomy.chapterNumber,
        references: extractCrossReferences(parsed.rawOfficialText),
      });

      results.ingested += 1;
      results.warnings += parsed.warnings.length;
    } catch (error) {
      console.error(`[fullRebuild] failed section ${sectionNumber}:`, error);
      results.failed += 1;
    }
  }

  console.log(JSON.stringify(results, null, 2));
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
