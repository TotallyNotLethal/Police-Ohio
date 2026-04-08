import { createHash } from 'node:crypto';

export type CrawlContext = {
  id: string;
  discoveredFrom?: string;
};

export type CrawlResponse = {
  url: string;
  html: string;
  status: number;
  fetchedAt: Date;
  bodyHash: string;
  attemptCount: number;
  context?: CrawlContext;
};

export type CrawlOptions = {
  maxRetries?: number;
  minDelayMs?: number;
  timeoutMs?: number;
  userAgent?: string;
  dedupeByBodyHash?: boolean;
  logger?: (line: string) => void;
};

const DEFAULT_OPTIONS: Required<Omit<CrawlOptions, 'logger'>> = {
  maxRetries: 4,
  minDelayMs: 750,
  timeoutMs: 15_000,
  userAgent: 'PoliceOhioBot/1.0 (+https://github.com/) ingestion crawler',
  dedupeByBodyHash: true,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jitter = (baseMs: number) => Math.floor(baseMs * (0.8 + Math.random() * 0.4));

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

const looksLikeTooManyRequestsPage = (html: string) => /429\s+too\s+many\s+requests/i.test(html);

export class OrcCrawler {
  private readonly seenUrls = new Set<string>();
  private readonly seenHashes = new Set<string>();
  private nextAllowedAt = 0;
  private readonly options: Required<Omit<CrawlOptions, 'logger'>>;
  private readonly logger?: CrawlOptions['logger'];

  constructor(options: CrawlOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    this.logger = options.logger;
  }

  resetDedupeState(): void {
    this.seenUrls.clear();
    this.seenHashes.clear();
  }

  async fetchHtml(url: string, context?: CrawlContext): Promise<CrawlResponse | null> {
    if (this.seenUrls.has(url)) {
      this.logger?.(`[crawler] skipped duplicate url ${url}`);
      return null;
    }

    this.seenUrls.add(url);

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.options.maxRetries) {
      attempt += 1;
      await this.waitForRateLimit();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'user-agent': this.options.userAgent,
            accept: 'text/html,application/xhtml+xml',
          },
          signal: controller.signal,
        });

        const html = await response.text();
        const bodyHash = hash(html);

        if (
          (response.status === 429 || looksLikeTooManyRequestsPage(html)) &&
          attempt <= this.options.maxRetries
        ) {
          throw new Error('upstream returned 429 Too Many Requests');
        }

        if (!response.ok && response.status >= 500 && attempt <= this.options.maxRetries) {
          throw new Error(`upstream returned ${response.status}`);
        }

        if (this.options.dedupeByBodyHash && this.seenHashes.has(bodyHash)) {
          this.logger?.(`[crawler] skipped duplicate body hash for ${url}`);
          return null;
        }

        if (this.options.dedupeByBodyHash) {
          this.seenHashes.add(bodyHash);
        }

        return {
          url,
          html,
          status: response.status,
          fetchedAt: new Date(),
          bodyHash,
          attemptCount: attempt,
          context,
        };
      } catch (error) {
        lastError = error;
        if (attempt > this.options.maxRetries) {
          break;
        }

        const backoff = jitter(this.options.minDelayMs * 2 ** (attempt - 1));
        this.logger?.(`[crawler] retry ${attempt}/${this.options.maxRetries} in ${backoff}ms for ${url}`);
        await sleep(backoff);
      } finally {
        clearTimeout(timer);
      }
    }

    this.logger?.(`[crawler] failed ${url}: ${String(lastError)}`);
    return null;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    if (now < this.nextAllowedAt) {
      await sleep(this.nextAllowedAt - now);
    }

    this.nextAllowedAt = Date.now() + jitter(this.options.minDelayMs);
  }
}

export const CODES_OHIO_BASE_URL = 'https://codes.ohio.gov/ohio-revised-code';

export const titleUrl = (titleNumber: string) => `${CODES_OHIO_BASE_URL}/title-${titleNumber}`;

export const chapterUrl = (chapterNumber: string) => `${CODES_OHIO_BASE_URL}/chapter-${chapterNumber}`;

export const sectionUrl = (sectionNumber: string) => `${CODES_OHIO_BASE_URL}/section-${sectionNumber}`;
