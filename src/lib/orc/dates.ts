export type ExtractedDates = {
  effectiveDate?: string;
  latestLegislation?: string;
};

const normalizeDate = (value: string): string => value.replaceAll(/\s+/g, ' ').trim();

export const extractDates = (text: string): ExtractedDates => {
  const compact = text.replaceAll(/\s+/g, ' ');

  const effectiveMatch = compact.match(
    /\bEffective\s+Date\s*[:\-]?\s*([A-Za-z]+\.?\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  );

  const legislationMatch = compact.match(
    /\bLatest\s+Legislation\s*[:\-]?\s*([^.;]{3,120})/i,
  );

  return {
    effectiveDate: effectiveMatch?.[1] ? normalizeDate(effectiveMatch[1]) : undefined,
    latestLegislation: legislationMatch?.[1] ? normalizeDate(legislationMatch[1]) : undefined,
  };
};
