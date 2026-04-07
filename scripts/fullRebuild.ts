import { prisma } from '../src/lib/db/prisma';
import { CODES_OHIO_BASE_URL, OrcCrawler, chapterUrl, titleUrl } from '../src/lib/orc/crawler';
import { detectChange } from '../src/lib/orc/change-detector';
import { persistParsedSection } from '../src/lib/orc/indexer';
import { deriveTaxonomyFromSection, normalizeSectionNumber } from '../src/lib/orc/normalizer';
import { parseOrcSectionHtml } from '../src/lib/orc/parser';
import { extractCrossReferences } from '../src/lib/orc/references';

const TITLE_LINK_REGEX = /href=["']([^"']*\/title-(\d+[A-Za-z]?))["']/gi;
const CHAPTER_LINK_REGEX = /href=["']([^"']*\/chapter-(\d+[A-Za-z]?))["']/gi;
const SECTION_LINK_REGEX = /href=["']([^"']*\/section-([\d.\-A-Za-z]+))["']/gi;

const toAbsoluteUrl = (href: string) =>
  href.startsWith('http') ? href : `https://codes.ohio.gov${href.startsWith('/') ? '' : '/'}${href}`;

const extractMatches = (html: string, pattern: RegExp): Array<{ href: string; id: string }> => {
  const matches: Array<{ href: string; id: string }> = [];
  for (const match of html.matchAll(pattern)) {
    matches.push({ href: toAbsoluteUrl(match[1]), id: match[2] });
  }
  return matches;
};

const discoverSectionNumbers = async (crawler: OrcCrawler): Promise<Set<string>> => {
  const sectionNumbers = new Set<string>();

  const landing = await crawler.fetchHtml(CODES_OHIO_BASE_URL, { id: 'root' });
  if (!landing) {
    throw new Error('Unable to fetch ORC landing page');
  }

  const discoveredTitles = new Set<string>();
  for (const match of extractMatches(landing.html, TITLE_LINK_REGEX)) {
    discoveredTitles.add(match.id);
  }

  for (const titleNumber of discoveredTitles) {
    const titlePage = await crawler.fetchHtml(titleUrl(titleNumber), { id: `title-${titleNumber}` });
    if (!titlePage) {
      continue;
    }

    const discoveredChapters = new Set<string>();
    for (const match of extractMatches(titlePage.html, CHAPTER_LINK_REGEX)) {
      discoveredChapters.add(match.id);
    }

    for (const chapterNumber of discoveredChapters) {
      const chapterPage = await crawler.fetchHtml(chapterUrl(chapterNumber), { id: `chapter-${chapterNumber}` });
      if (!chapterPage) {
        continue;
      }

      for (const match of extractMatches(chapterPage.html, SECTION_LINK_REGEX)) {
        sectionNumbers.add(normalizeSectionNumber(match.id));
      }
    }
  }

  return sectionNumbers;
};

const run = async () => {
  const crawler = new OrcCrawler({ logger: console.log, minDelayMs: 900, maxRetries: 5 });
  const sectionNumbers = await discoverSectionNumbers(crawler);

  if (sectionNumbers.size === 0) {
    throw new Error('Unable to discover any ORC section URLs from titles/chapters');
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
