import { createHash } from 'node:crypto';

import axios, { type AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

import { prisma } from '../src/lib/db/prisma';

const ROOT_URL = 'https://codes.ohio.gov/ohio-revised-code';
const MAX_CONCURRENCY = 4;

type TitleLink = {
  titleNumber: string;
  titleName?: string;
  url: string;
};

type ChapterLink = {
  titleNumber: string;
  titleName?: string;
  chapterNumber: string;
  chapterName?: string;
  url: string;
};

type SectionLink = {
  titleNumber: string;
  titleName?: string;
  chapterNumber: string;
  chapterName?: string;
  sectionNumber: string;
  url: string;
};

type ParsedSection = {
  sectionNumber: string;
  titleNumber?: string;
  titleName?: string;
  chapterNumber?: string;
  chapterName?: string;
  heading: string;
  body: string;
  plainText: string;
  effectiveDate?: string;
  latestBill?: string;
  sourceUrl: string;
};

type FailedRow = {
  sectionNumber?: string;
  url: string;
  error: string;
};

type ImportResult = {
  discovered: {
    titles: number;
    chapters: number;
    sections: number;
  };
  inserted: number;
  updated: number;
  skipped: number;
  failed: FailedRow[];
};

type LogLevel = 'info' | 'warn' | 'error';

const TITLE_LINK_REGEX = /\/title-(\d+[A-Za-z]?)/i;
const CHAPTER_LINK_REGEX = /\/chapter-(\d+[A-Za-z]?)/i;
const SECTION_LINK_REGEX = /\/section-([\d.\-A-Za-z]+)/i;

const cleanText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const hashSection = (parsed: ParsedSection): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        sectionNumber: parsed.sectionNumber,
        titleNumber: parsed.titleNumber,
        chapterNumber: parsed.chapterNumber,
        heading: parsed.heading,
        body: parsed.body,
        plainText: parsed.plainText,
        effectiveDate: parsed.effectiveDate,
        latestBill: parsed.latestBill,
        sourceUrl: parsed.sourceUrl,
      }),
    )
    .digest('hex');

const log = (level: LogLevel, event: string, payload: Record<string, unknown> = {}) => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...payload,
    }),
  );
};

const toAbsoluteUrl = (href: string): string => new URL(href, ROOT_URL).toString();

const createHttp = (): AxiosInstance =>
  axios.create({
    timeout: 20_000,
    headers: {
      'user-agent': 'PoliceOhioBot/1.0 (+https://github.com/)',
      accept: 'text/html,application/xhtml+xml',
    },
  });

const fetchHtml = async (http: AxiosInstance, url: string): Promise<string> => {
  const response = await http.get<string>(url);
  return response.data;
};

const discoverTitles = async (http: AxiosInstance): Promise<TitleLink[]> => {
  const html = await fetchHtml(http, ROOT_URL);
  const $ = cheerio.load(html);

  const titles = new Map<string, TitleLink>();

  $('a[href]').each((_, node) => {
    const href = $(node).attr('href');
    if (!href) {
      return;
    }

    const match = href.match(TITLE_LINK_REGEX);
    if (!match) {
      return;
    }

    const titleNumber = match[1];
    titles.set(titleNumber, {
      titleNumber,
      titleName: cleanText($(node).text()) || undefined,
      url: toAbsoluteUrl(href),
    });
  });

  return [...titles.values()].sort((a, b) => a.titleNumber.localeCompare(b.titleNumber, undefined, { numeric: true }));
};

const discoverChapters = async (http: AxiosInstance, title: TitleLink): Promise<ChapterLink[]> => {
  const html = await fetchHtml(http, title.url);
  const $ = cheerio.load(html);

  const chapters = new Map<string, ChapterLink>();

  $('a[href]').each((_, node) => {
    const href = $(node).attr('href');
    if (!href) {
      return;
    }

    const match = href.match(CHAPTER_LINK_REGEX);
    if (!match) {
      return;
    }

    const chapterNumber = match[1];
    chapters.set(chapterNumber, {
      titleNumber: title.titleNumber,
      titleName: title.titleName,
      chapterNumber,
      chapterName: cleanText($(node).text()) || undefined,
      url: toAbsoluteUrl(href),
    });
  });

  return [...chapters.values()].sort((a, b) => a.chapterNumber.localeCompare(b.chapterNumber, undefined, { numeric: true }));
};

const discoverSections = async (http: AxiosInstance, chapter: ChapterLink): Promise<SectionLink[]> => {
  const html = await fetchHtml(http, chapter.url);
  const $ = cheerio.load(html);

  const sections = new Map<string, SectionLink>();

  $('a[href]').each((_, node) => {
    const href = $(node).attr('href');
    if (!href) {
      return;
    }

    const match = href.match(SECTION_LINK_REGEX);
    if (!match) {
      return;
    }

    const sectionNumber = match[1];
    sections.set(sectionNumber, {
      titleNumber: chapter.titleNumber,
      titleName: chapter.titleName,
      chapterNumber: chapter.chapterNumber,
      chapterName: chapter.chapterName,
      sectionNumber,
      url: toAbsoluteUrl(href),
    });
  });

  return [...sections.values()].sort((a, b) => a.sectionNumber.localeCompare(b.sectionNumber, undefined, { numeric: true }));
};

const extractBodyHtml = ($: cheerio.CheerioAPI): string => {
  const prioritizedSelectors = [
    'section.section-body',
    'div.section-body',
    'section.content-body',
    'div.content-body',
    'section.law-content',
    'div.law-content',
    'main article',
    'article',
    'main',
  ];

  for (const selector of prioritizedSelectors) {
    const html = $(selector).first().html();
    if (html && cleanText($(selector).first().text())) {
      return html;
    }
  }

  return $('body').html() ?? '';
};

const parseSection = (html: string, section: SectionLink): ParsedSection => {
  const $ = cheerio.load(html);

  const heading = cleanText(
    $('h1').first().text() || $('meta[name="dcterms.title"]').attr('content') || $('title').first().text() || '',
  );

  const bodyHtml = extractBodyHtml($);
  const bodyText = cleanText(cheerio.load(`<div>${bodyHtml}</div>`)('div').text());

  const fullText = cleanText(`${heading}\n${bodyText}`);

  const effectiveDate = fullText.match(/effective:\s*([^.;\n]+)/i)?.[1]?.trim();
  const latestBill =
    fullText.match(/latest\s+bill:\s*([^.;\n]+)/i)?.[1]?.trim() ||
    fullText.match(/(Am\.\s*Sub\.\s*H\.B\.\s*\d+|Sub\.\s*S\.B\.\s*\d+|H\.B\.\s*\d+|S\.B\.\s*\d+)/i)?.[1]?.trim();

  const sectionNumberFromHeading = heading.match(/section\s+([\d.\-A-Za-z]+)/i)?.[1];

  return {
    sectionNumber: section.sectionNumber || sectionNumberFromHeading || section.sectionNumber,
    titleNumber: section.titleNumber,
    titleName: section.titleName,
    chapterNumber: section.chapterNumber,
    chapterName: section.chapterName,
    heading,
    body: bodyHtml,
    plainText: fullText,
    effectiveDate,
    latestBill,
    sourceUrl: section.url,
  };
};

const upsertSection = async (parsed: ParsedSection): Promise<'inserted' | 'updated' | 'skipped'> => {
  const nextHash = hashSection(parsed);
  const orcCode = (prisma as unknown as {
    orcCode: {
      findUnique: (args: unknown) => Promise<{ id: string; hash: string } | null>;
      upsert: (args: unknown) => Promise<unknown>;
    };
  }).orcCode;

  const existing = await orcCode.findUnique({
    where: { sectionNumber: parsed.sectionNumber },
    select: { id: true, hash: true },
  });

  if (existing?.hash === nextHash) {
    return 'skipped';
  }

  await orcCode.upsert({
    where: { sectionNumber: parsed.sectionNumber },
    create: {
      sectionNumber: parsed.sectionNumber,
      titleNumber: parsed.titleNumber,
      titleName: parsed.titleName,
      chapterNumber: parsed.chapterNumber,
      chapterName: parsed.chapterName,
      body: parsed.body,
      plainText: [
        parsed.heading,
        parsed.plainText,
        parsed.effectiveDate ? `Effective: ${parsed.effectiveDate}` : undefined,
        parsed.latestBill ? `Latest Bill: ${parsed.latestBill}` : undefined,
        `Source: ${parsed.sourceUrl}`,
      ]
        .filter(Boolean)
        .join('\n'),
      hash: nextHash,
    },
    update: {
      titleNumber: parsed.titleNumber,
      titleName: parsed.titleName,
      chapterNumber: parsed.chapterNumber,
      chapterName: parsed.chapterName,
      body: parsed.body,
      plainText: [
        parsed.heading,
        parsed.plainText,
        parsed.effectiveDate ? `Effective: ${parsed.effectiveDate}` : undefined,
        parsed.latestBill ? `Latest Bill: ${parsed.latestBill}` : undefined,
        `Source: ${parsed.sourceUrl}`,
      ]
        .filter(Boolean)
        .join('\n'),
      hash: nextHash,
    },
  });

  return existing ? 'updated' : 'inserted';
};

const run = async (): Promise<void> => {
  const http = createHttp();
  const result: ImportResult = {
    discovered: { titles: 0, chapters: 0, sections: 0 },
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: [],
  };

  log('info', 'import.start', { rootUrl: ROOT_URL, concurrency: MAX_CONCURRENCY });

  const titles = await discoverTitles(http);
  result.discovered.titles = titles.length;
  log('info', 'discover.titles.complete', { count: titles.length });

  const chapters = (
    await Promise.all(
      titles.map(async (title) => {
        try {
          return await discoverChapters(http, title);
        } catch (error) {
          log('warn', 'discover.chapters.failed', {
            titleNumber: title.titleNumber,
            url: title.url,
            error: error instanceof Error ? error.message : String(error),
          });
          return [];
        }
      }),
    )
  ).flat();

  result.discovered.chapters = chapters.length;
  log('info', 'discover.chapters.complete', { count: chapters.length });

  const sections = (
    await Promise.all(
      chapters.map(async (chapter) => {
        try {
          return await discoverSections(http, chapter);
        } catch (error) {
          log('warn', 'discover.sections.failed', {
            chapterNumber: chapter.chapterNumber,
            titleNumber: chapter.titleNumber,
            url: chapter.url,
            error: error instanceof Error ? error.message : String(error),
          });
          return [];
        }
      }),
    )
  ).flat();

  result.discovered.sections = sections.length;
  log('info', 'discover.sections.complete', { count: sections.length });

  const limit = pLimit(MAX_CONCURRENCY);

  await Promise.all(
    sections.map((section) =>
      limit(async () => {
        try {
          const html = await fetchHtml(http, section.url);
          const parsed = parseSection(html, section);

          const operation = await upsertSection(parsed);
          result[operation] += 1;

          log('info', `row.${operation}`, {
            sectionNumber: parsed.sectionNumber,
            titleNumber: parsed.titleNumber,
            chapterNumber: parsed.chapterNumber,
            effectiveDate: parsed.effectiveDate,
            latestBill: parsed.latestBill,
            sourceUrl: parsed.sourceUrl,
          });
        } catch (error) {
          const failure: FailedRow = {
            sectionNumber: section.sectionNumber,
            url: section.url,
            error: error instanceof Error ? error.message : String(error),
          };
          result.failed.push(failure);

          log('error', 'row.failed', failure);
        }
      }),
    ),
  );

  log('info', 'import.complete', {
    discovered: result.discovered,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    failed: result.failed.length,
  });

  if (result.failed.length > 0) {
    log('warn', 'import.failures', { failures: result.failed });
  }
};

run()
  .catch((error) => {
    log('error', 'import.crash', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
