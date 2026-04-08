import { prisma } from '../src/lib/db/prisma';
import { CODES_OHIO_BASE_URL, OrcCrawler, chapterUrl, titleUrl, sectionUrl } from '../src/lib/orc/crawler';
import { detectChange } from '../src/lib/orc/change-detector';
import { persistParsedSection } from '../src/lib/orc/indexer';
import { deriveTaxonomyFromSection, normalizeSectionNumber } from '../src/lib/orc/normalizer';
import { parseOrcSectionHtml } from '../src/lib/orc/parser';
import { extractCrossReferences } from '../src/lib/orc/references';

const TITLE_LINK_REGEX = /<table[^>]*class=["'][^"']*laws-table[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']*title-(\d+[A-Za-z]?))["']/gi;
const CHAPTER_LINK_REGEX = /<table[^>]*class=["'][^"']*laws-table[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']*chapter-(\d+[A-Za-z]?))["']/gi;
const SECTION_ENTRY_REGEX =
  /<span[^>]*class=["'][^"']*content-head-text[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']*section-([\d.\-A-Za-z]+))["'][^>]*>[\s\S]*?<\/a>[\s\S]*?<\/span>[\s\S]*?<div[^>]*class=["'][^"']*content-body[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
const SECTION_LINK_REGEX = /href=["']([^"']*section-([\d.\-A-Za-z]+))["']/gi;

const toAbsoluteUrl = (href: string) =>
  href.startsWith('http') ? href : `https://codes.ohio.gov${href.startsWith('/') ? '' : '/'}${href}`;

const extractMatches = (html: string, pattern: RegExp): Array<{ href: string; id: string }> => {
  const matches: Array<{ href: string; id: string }> = [];
  for (const match of html.matchAll(pattern)) {
    matches.push({ href: toAbsoluteUrl(match[1]), id: match[2] });
  }
  return matches;
};

type DiscoveredSection = {
  sectionNumber: string;
  sectionUrl: string;
  embeddedHtml?: string;
};

const discoverSections = async (crawler: OrcCrawler): Promise<Map<string, DiscoveredSection>> => {
  const discoveredSections = new Map<string, DiscoveredSection>();

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

      for (const match of chapterPage.html.matchAll(SECTION_ENTRY_REGEX)) {
        const sectionNumber = normalizeSectionNumber(match[2]);
        discoveredSections.set(sectionNumber, {
          sectionNumber,
          sectionUrl: toAbsoluteUrl(match[1]),
          embeddedHtml: match[3],
        });
      }

      for (const match of extractMatches(chapterPage.html, SECTION_LINK_REGEX)) {
        const sectionNumber = normalizeSectionNumber(match.id);
        if (!discoveredSections.has(sectionNumber)) {
          discoveredSections.set(sectionNumber, {
            sectionNumber,
            sectionUrl: sectionUrl(sectionNumber),
          });
        }
      }
    }
  }

  return discoveredSections;
};

const run = async () => {
  const crawler = new OrcCrawler({ logger: console.log, minDelayMs: 900, maxRetries: 5 });
  const sections = await discoverSections(crawler);

  if (sections.size === 0) {
    throw new Error('Unable to recursively discover any ORC sections from titles and chapters');
  }

  const results = {
    visited: 0,
    ingested: 0,
    skippedUnchanged: 0,
    failed: 0,
    warnings: 0,
  };

  for (const section of sections.values()) {
    results.visited += 1;

    try {
      let parsed = section.embeddedHtml ? parseOrcSectionHtml(section.embeddedHtml) : undefined;

      if (!parsed?.rawOfficialText) {
        const response = await crawler.fetchHtml(section.sectionUrl, {
          id: `section-${section.sectionNumber}`,
        });

        if (!response) {
          continue;
        }

        parsed = parseOrcSectionHtml(response.html);
      }

      if (!parsed) {
        continue;
      }

      parsed.sectionNumber = parsed.sectionNumber || section.sectionNumber;

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
      console.error(`[fullRebuild] failed section ${section.sectionNumber}:`, error);
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
