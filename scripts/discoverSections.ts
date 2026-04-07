import { chapterUrl, OrcCrawler } from '../src/lib/orc/crawler';

const SECTION_LINK_REGEX = /href=["']([^"']*section-([\d.\-A-Za-z]+))["']/gi;

const run = async () => {
  const chapterNumber = process.argv[2];
  if (!chapterNumber) {
    throw new Error('Usage: tsx scripts/discoverSections.ts <chapterNumber>');
  }

  const crawler = new OrcCrawler({ logger: console.log });
  const page = await crawler.fetchHtml(chapterUrl(chapterNumber), { id: `chapter-${chapterNumber}` });

  if (!page) {
    throw new Error(`Could not fetch chapter ${chapterNumber}`);
  }

  const sections = new Map<string, string>();
  for (const match of page.html.matchAll(SECTION_LINK_REGEX)) {
    sections.set(match[2], `https://codes.ohio.gov${match[1].startsWith('/') ? '' : '/'}${match[1]}`);
  }

  console.log(
    JSON.stringify(
      [...sections.entries()]
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([sectionNumber, url]) => ({ chapterNumber, sectionNumber, url })),
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
