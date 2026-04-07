export type OrcTaxonomy = {
  titleNumber: string;
  chapterNumber: string;
  sectionNumber: string;
};

export const normalizeSectionNumber = (value: string): string =>
  value.replaceAll(/\s+/g, '').replaceAll(/[()]/g, '').trim();

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');

export const deriveTaxonomyFromSection = (sectionNumber: string): OrcTaxonomy => {
  const normalized = normalizeSectionNumber(sectionNumber);
  const [chapterNumber] = normalized.split('.');
  const titleNumber = chapterNumber.slice(0, 2);

  return {
    titleNumber,
    chapterNumber,
    sectionNumber: normalized,
  };
};

export const canonicalUrlForSection = (sectionNumber: string): string =>
  `https://codes.ohio.gov/ohio-revised-code/section-${normalizeSectionNumber(sectionNumber)}`;
