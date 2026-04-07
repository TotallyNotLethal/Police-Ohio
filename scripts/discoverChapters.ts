import { OrcCrawler, titleUrl } from '../src/lib/orc/crawler';

const CHAPTER_LINK_REGEX = /href=["']([^"']*chapter-(\d+[A-Za-z]?))["']/gi;

const run = async () => {
  const titleNumber = process.argv[2];
  if (!titleNumber) {
    throw new Error('Usage: tsx scripts/discoverChapters.ts <titleNumber>');
  }

  const crawler = new OrcCrawler({ logger: console.log });
  const page = await crawler.fetchHtml(titleUrl(titleNumber), { id: `title-${titleNumber}` });

  if (!page) {
    throw new Error(`Could not fetch title ${titleNumber}`);
  }

  const chapters = new Map<string, string>();
  for (const match of page.html.matchAll(CHAPTER_LINK_REGEX)) {
    chapters.set(match[2], `https://codes.ohio.gov${match[1].startsWith('/') ? '' : '/'}${match[1]}`);
  }

  console.log(
    JSON.stringify(
      [...chapters.entries()]
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([chapterNumber, url]) => ({ titleNumber, chapterNumber, url })),
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
