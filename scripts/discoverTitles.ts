import { CODES_OHIO_BASE_URL, OrcCrawler } from '../src/lib/orc/crawler';

const TITLE_LINK_REGEX = /href=["']([^"']*\/title-(\d+[A-Za-z]?))["']/gi;

const run = async () => {
  const crawler = new OrcCrawler({ logger: console.log });
  const page = await crawler.fetchHtml(CODES_OHIO_BASE_URL, { id: 'root' });

  if (!page) {
    throw new Error('Could not fetch ORC landing page');
  }

  const titles = new Map<string, string>();
  for (const match of page.html.matchAll(TITLE_LINK_REGEX)) {
    titles.set(match[2], `https://codes.ohio.gov${match[1].startsWith('/') ? '' : '/'}${match[1]}`);
  }

  const results = [...titles.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([titleNumber, url]) => ({ titleNumber, url }));

  console.log(JSON.stringify(results, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
