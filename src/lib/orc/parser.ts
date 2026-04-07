import { extractDates } from './dates';

export type ParseWarningCode =
  | 'MISSING_SECTION_NUMBER'
  | 'MISSING_HEADING'
  | 'MISSING_BODY'
  | 'LOW_CONFIDENCE_BODY_MATCH'
  | 'MISSING_EFFECTIVE_DATE'
  | 'MISSING_LATEST_LEGISLATION'
  | 'MISSING_PDF_LINK';

export type ParseWarning = {
  code: ParseWarningCode;
  message: string;
  confidence: 'low' | 'medium' | 'high';
  evidence?: string;
};

export type ParsedOrcSection = {
  sectionNumber: string;
  heading: string;
  rawOfficialText: string;
  effectiveDate?: string;
  latestLegislation?: string;
  pdfUrl?: string;
  warnings: ParseWarning[];
};

const TAG_REGEX = /<[^>]+>/g;
const WHITESPACE_REGEX = /\s+/g;

const decodeEntities = (text: string): string =>
  text
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

export const stripHtml = (html: string): string =>
  decodeEntities(html.replaceAll(TAG_REGEX, ' ')).replaceAll(WHITESPACE_REGEX, ' ').trim();

const pickFirst = (html: string, patterns: RegExp[]): string | undefined => {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return stripHtml(match[1]);
    }
  }

  return undefined;
};

const extractBodyHtml = (html: string): string | undefined => {
  const patterns = [
    /<section[^>]*class=["'][^"']*(?:section-body|content-body|law-content)[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
    /<div[^>]*class=["'][^"']*(?:section-body|content-body|law-content|main-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
};

export const parseOrcSectionHtml = (html: string): ParsedOrcSection => {
  const warnings: ParseWarning[] = [];

  const sectionNumber =
    pickFirst(html, [
      /<meta[^>]*name=["']citation_title["'][^>]*content=["']Section\s+([\d.\-A-Za-z]+)["'][^>]*>/i,
      /<h1[^>]*>[\s\S]*?Section\s+([\d.\-A-Za-z]+)[\s\S]*?<\/h1>/i,
      /<span[^>]*class=["'][^"']*section-number[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    ]) ?? '';

  if (!sectionNumber) {
    warnings.push({
      code: 'MISSING_SECTION_NUMBER',
      message: 'Could not confidently extract section number from page.',
      confidence: 'low',
    });
  }

  const heading =
    pickFirst(html, [
      /<h1[^>]*>([\s\S]*?)<\/h1>/i,
      /<meta[^>]*name=["']dcterms.title["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ]) ?? '';

  if (!heading) {
    warnings.push({
      code: 'MISSING_HEADING',
      message: 'No heading/title element found for section page.',
      confidence: 'medium',
    });
  }

  const bodyHtml = extractBodyHtml(html);
  if (!bodyHtml) {
    warnings.push({
      code: 'MISSING_BODY',
      message: 'Could not locate a known body container for legal text.',
      confidence: 'low',
    });
  }

  const rawOfficialText = stripHtml(bodyHtml ?? html);

  if (!bodyHtml && rawOfficialText.length > 0) {
    warnings.push({
      code: 'LOW_CONFIDENCE_BODY_MATCH',
      message: 'Falling back to full document text; body extraction confidence is low.',
      confidence: 'low',
      evidence: rawOfficialText.slice(0, 240),
    });
  }

  const { effectiveDate, latestLegislation } = extractDates(rawOfficialText);

  if (!effectiveDate) {
    warnings.push({
      code: 'MISSING_EFFECTIVE_DATE',
      message: 'No effective date marker found in section text.',
      confidence: 'medium',
    });
  }

  if (!latestLegislation) {
    warnings.push({
      code: 'MISSING_LATEST_LEGISLATION',
      message: 'No latest legislation marker found in section text.',
      confidence: 'medium',
    });
  }

  const pdfUrl = pickFirst(html, [
    /<a[^>]*href=["']([^"']+\.pdf)["'][^>]*>\s*(?:PDF|Download PDF|Official PDF)/i,
  ]);

  if (!pdfUrl) {
    warnings.push({
      code: 'MISSING_PDF_LINK',
      message: 'No PDF URL detected on section page.',
      confidence: 'medium',
    });
  }

  return {
    sectionNumber,
    heading,
    rawOfficialText,
    effectiveDate,
    latestLegislation,
    pdfUrl,
    warnings,
  };
};
