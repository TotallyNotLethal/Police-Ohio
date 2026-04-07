import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { slugify } from './normalizer';
import type { ParsedOrcSection } from './parser';
import type { ExtractedReference } from './references';
import { summarizeSection } from './summary';

export type PersistSectionInput = {
  prisma: PrismaClient;
  parsed: ParsedOrcSection;
  sourceHash: string;
  titleNumber: string;
  chapterNumber: string;
  references: ExtractedReference[];
};

export const persistParsedSection = async ({
  prisma,
  parsed,
  sourceHash,
  titleNumber,
  chapterNumber,
  references,
}: PersistSectionInput) => {
  const now = new Date();

  const title = await prisma.orcTitle.upsert({
    where: { titleNumber },
    create: {
      titleNumber,
      slug: slugify(`title-${titleNumber}`),
      name: `Title ${titleNumber}`,
      sourceHash,
      sourceUpdatedAt: now,
      ingestedAt: now,
    },
    update: {
      sourceHash,
      sourceUpdatedAt: now,
      ingestedAt: now,
    },
  });

  const chapter = await prisma.orcChapter.upsert({
    where: {
      titleId_chapterNumber: {
        titleId: title.id,
        chapterNumber,
      },
    },
    create: {
      titleId: title.id,
      chapterNumber,
      slug: slugify(`chapter-${chapterNumber}`),
      name: `Chapter ${chapterNumber}`,
      sourceHash,
      sourceUpdatedAt: now,
      ingestedAt: now,
    },
    update: {
      sourceHash,
      sourceUpdatedAt: now,
      ingestedAt: now,
    },
  });

  const existingSection = await prisma.orcSection.findUnique({
    where: {
      chapterId_sectionNumber: {
        chapterId: chapter.id,
        sectionNumber: parsed.sectionNumber,
      },
    },
    select: {
      bodyText: true,
    },
  });

  const parsedOfficialText = parsed.rawOfficialText.trim();
  const officialTextForStorage = parsedOfficialText || existingSection?.bodyText || '';
  const appSummary = summarizeSection(parsed.heading, officialTextForStorage);
  const parsedNodesPayload = JSON.parse(
    JSON.stringify({
      warnings: parsed.warnings,
      parserConfidence: parsed.parserConfidence,
      structureMatched: parsed.structureMatched,
    }),
  ) as Prisma.InputJsonValue;
  const renderBlocksPayload = JSON.parse(JSON.stringify({ summary: appSummary })) as Prisma.InputJsonValue;

  const section = await prisma.orcSection.upsert({
    where: {
      chapterId_sectionNumber: {
        chapterId: chapter.id,
        sectionNumber: parsed.sectionNumber,
      },
    },
    create: {
      titleId: title.id,
      chapterId: chapter.id,
      sectionNumber: parsed.sectionNumber,
      slug: slugify(parsed.sectionNumber),
      heading: parsed.heading,
      bodyText: officialTextForStorage,
      sourceHash,
      sourceUpdatedAt: now,
      ingestedAt: now,
      tags: {
        effectiveDate: parsed.effectiveDate,
        latestLegislation: parsed.latestLegislation,
        pdfUrl: parsed.pdfUrl,
      },
      parsedNodes: parsedNodesPayload,
      renderBlocks: renderBlocksPayload,
    },
    update: {
      heading: parsed.heading,
      bodyText: officialTextForStorage,
      sourceHash,
      sourceUpdatedAt: now,
      ingestedAt: now,
      tags: {
        effectiveDate: parsed.effectiveDate,
        latestLegislation: parsed.latestLegislation,
        pdfUrl: parsed.pdfUrl,
      },
      parsedNodes: parsedNodesPayload,
      renderBlocks: renderBlocksPayload,
    },
  });

  await prisma.crossReference.deleteMany({ where: { sourceSectionId: section.id } });

  if (references.length > 0) {
    await prisma.crossReference.createMany({
      data: references.map((reference) => ({
        sourceSectionId: section.id,
        citationText: reference.citationText,
        targetLabel: reference.targetSectionNumber,
        targetUrl: reference.targetUrl,
        ingestedAt: now,
      })),
    });
  }

  return section;
};

export type SearchDocument = {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
};

export const buildSearchDocument = (input: {
  sectionId: string;
  sectionNumber: string;
  heading: string;
  rawOfficialText: string;
  effectiveDate?: string;
  latestLegislation?: string;
}) => ({
  id: input.sectionId,
  title: `${input.sectionNumber} ${input.heading}`.trim(),
  content: input.rawOfficialText,
  metadata: {
    sectionNumber: input.sectionNumber,
    effectiveDate: input.effectiveDate,
    latestLegislation: input.latestLegislation,
  },
} satisfies SearchDocument);
