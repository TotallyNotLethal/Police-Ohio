import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import axios, { type AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

import { prisma } from '../src/lib/db/prisma';

const ROOT_URL = 'https://codes.ohio.gov/ohio-revised-code';
const REQUEST_DELAY_MS = 300;
const RETRY_BASE_DELAY_MS = 500;
const MAX_HTTP_RETRIES = 4;
const PROGRESS_FILE = path.resolve(__dirname, 'orc-progress.json');

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

type ImportProgress = {
  lastTitle: string;
  lastChapter: string;
  lastSection: string;
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

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const compareOrdinals = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { numeric: true });

const isTransientHttpError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  if (status && (status === 429 || status >= 500)) {
    return true;
  }

  const code = error.code;
  return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNABORTED' || code === 'EAI_AGAIN';
};

const readProgress = async (): Promise<ImportProgress | null> => {
  try {
    const raw = await fs.readFile(PROGRESS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ImportProgress>;

    if (
      typeof parsed.lastTitle === 'string' &&
      typeof parsed.lastChapter === 'string' &&
      typeof parsed.lastSection === 'string'
    ) {
      return {
        lastTitle: parsed.lastTitle,
        lastChapter: parsed.lastChapter,
        lastSection: parsed.lastSection,
      };
    }

    log('warn', 'checkpoint.invalid', { file: PROGRESS_FILE });
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
};

const writeProgress = async (progress: ImportProgress): Promise<void> => {
  await fs.writeFile(PROGRESS_FILE, `${JSON.stringify(progress, null, 2)}\n`, 'utf8');
};

const createHttp = (): AxiosInstance =>
  axios.create({
    timeout: 20_000,
    headers: {
      'user-agent': 'PoliceOhioBot/1.0 (+https://github.com/)',
      accept: 'text/html,application/xhtml+xml',
    },
  });

const fetchHtml = async (http: AxiosInstance, url: string): Promise<string> => {
  for (let attempt = 1; attempt <= MAX_HTTP_RETRIES; attempt += 1) {
    await delay(REQUEST_DELAY_MS);

    try {
      const response = await http.get<string>(url);
      return response.data;
    } catch (error) {
      const retryable = isTransientHttpError(error);
      const isLastAttempt = attempt === MAX_HTTP_RETRIES;

      if (!retryable || isLastAttempt) {
        throw error;
      }

      const backoffMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      log('warn', 'http.retry', {
        url,
        attempt,
        backoffMs,
        error: error instanceof Error ? error.message : String(error),
      });
      await delay(backoffMs);
    }
  }

  throw new Error(`Failed to fetch ${url}`);
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

  return [...titles.values()].sort((a, b) => compareOrdinals(a.titleNumber, b.titleNumber));
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

  return [...chapters.values()].sort((a, b) => compareOrdinals(a.chapterNumber, b.chapterNumber));
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

  return [...sections.values()].sort((a, b) => compareOrdinals(a.sectionNumber, b.sectionNumber));
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

  log('info', 'import.start', { rootUrl: ROOT_URL, requestDelayMs: REQUEST_DELAY_MS });

  const titles = await discoverTitles(http);
  result.discovered.titles = titles.length;
  log('info', 'discover.titles.complete', { count: titles.length });

  const checkpoint = await readProgress();
  let hasPassedCheckpoint = !checkpoint;

  log('info', 'checkpoint.state', {
    file: PROGRESS_FILE,
    checkpoint,
  });

  for (const title of titles) {
    if (checkpoint && !hasPassedCheckpoint && compareOrdinals(title.titleNumber, checkpoint.lastTitle) < 0) {
      continue;
    }

    let chapters: ChapterLink[] = [];
    try {
      chapters = await discoverChapters(http, title);
    } catch (error) {
      log('warn', 'discover.chapters.failed', {
        titleNumber: title.titleNumber,
        url: title.url,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    result.discovered.chapters += chapters.length;

    for (const chapter of chapters) {
      if (
        checkpoint &&
        !hasPassedCheckpoint &&
        compareOrdinals(title.titleNumber, checkpoint.lastTitle) === 0 &&
        compareOrdinals(chapter.chapterNumber, checkpoint.lastChapter) < 0
      ) {
        continue;
      }

      let sections: SectionLink[] = [];
      try {
        sections = await discoverSections(http, chapter);
      } catch (error) {
        log('warn', 'discover.sections.failed', {
          chapterNumber: chapter.chapterNumber,
          titleNumber: chapter.titleNumber,
          url: chapter.url,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      result.discovered.sections += sections.length;

      for (const section of sections) {
        if (!hasPassedCheckpoint && checkpoint) {
          const titleCmp = compareOrdinals(section.titleNumber, checkpoint.lastTitle);
          if (titleCmp < 0) {
            continue;
          }

          if (titleCmp === 0) {
            const chapterCmp = compareOrdinals(section.chapterNumber, checkpoint.lastChapter);
            if (chapterCmp < 0) {
              continue;
            }

            if (chapterCmp === 0 && compareOrdinals(section.sectionNumber, checkpoint.lastSection) <= 0) {
              continue;
            }
          }

          hasPassedCheckpoint = true;
          log('info', 'checkpoint.resume', {
            from: checkpoint,
            nextTitle: section.titleNumber,
            nextChapter: section.chapterNumber,
            nextSection: section.sectionNumber,
          });
        }

        try {
          const html = await fetchHtml(http, section.url);
          const parsed = parseSection(html, section);

          const operation = await upsertSection(parsed);
          result[operation] += 1;

          await writeProgress({
            lastTitle: section.titleNumber,
            lastChapter: section.chapterNumber,
            lastSection: section.sectionNumber,
          });

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
      }
    }
  }

  log('info', 'discover.chapters.complete', { count: result.discovered.chapters });
  log('info', 'discover.sections.complete', { count: result.discovered.sections });

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
