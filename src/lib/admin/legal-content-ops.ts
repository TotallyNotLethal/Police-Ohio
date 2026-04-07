import { prisma } from '../db/prisma';
import type { Prisma } from '@prisma/client';
import { OrcCrawler, sectionUrl } from '../orc/crawler';
import { detectChange } from '../orc/change-detector';
import { persistParsedSection } from '../orc/indexer';
import { deriveTaxonomyFromSection, normalizeSectionNumber } from '../orc/normalizer';
import { parseOrcSectionHtml } from '../orc/parser';
import { extractCrossReferences } from '../orc/references';

const confidenceToSeverity = (confidence: 'low' | 'medium' | 'high') => {
  if (confidence === 'high') {
    return 'HIGH' as const;
  }

  if (confidence === 'medium') {
    return 'MEDIUM' as const;
  }

  return 'LOW' as const;
};

export const runSingleSectionIngestion = async (rawSectionNumber: string) => {
  const sectionNumber = normalizeSectionNumber(rawSectionNumber);
  const run = await prisma.ingestionRun.create({
    data: {
      trigger: `admin:ingest:${sectionNumber}`,
      status: 'RUNNING',
      visitedCount: 1,
    },
  });

  try {
    const crawler = new OrcCrawler({ logger: console.log });
    const response = await crawler.fetchHtml(sectionUrl(sectionNumber), { id: `admin-${sectionNumber}` });

    if (!response) {
      throw new Error(`No response for section ${sectionNumber}`);
    }

    const parsed = parseOrcSectionHtml(response.html);
    parsed.sectionNumber = parsed.sectionNumber || sectionNumber;

    const taxonomy = deriveTaxonomyFromSection(parsed.sectionNumber);
    const existing = await prisma.orcSection.findFirst({
      where: {
        sectionNumber: parsed.sectionNumber,
        chapter: { chapterNumber: taxonomy.chapterNumber },
      },
      select: { id: true, sourceHash: true, contentVersion: true },
    });

    const missingMetadata = [
      !parsed.effectiveDate ? 'effectiveDate' : null,
      !parsed.latestLegislation ? 'latestLegislation' : null,
      !parsed.pdfUrl ? 'pdfUrl' : null,
    ].filter(Boolean) as string[];

    const changed = detectChange(existing?.sourceHash, parsed.rawOfficialText);
    let sectionId = existing?.id;

    if (changed.changed) {
      const persisted = await persistParsedSection({
        prisma,
        parsed,
        sourceHash: changed.hash,
        titleNumber: taxonomy.titleNumber,
        chapterNumber: taxonomy.chapterNumber,
        references: extractCrossReferences(parsed.rawOfficialText),
      });

      sectionId = persisted.id;

      await prisma.changedStatute.create({
        data: {
          ingestionRunId: run.id,
          sectionId: persisted.id,
          sectionNumber: parsed.sectionNumber,
          oldHash: existing?.sourceHash,
          newHash: changed.hash,
          previousVersion: existing?.contentVersion,
          nextVersion: persisted.contentVersion,
          diffSummary: existing
            ? `Content hash changed for section ${parsed.sectionNumber}.`
            : `New section ${parsed.sectionNumber} ingested.`,
        },
      });
    }

    if (missingMetadata.length > 0) {
      await prisma.missingMetadataLog.create({
        data: {
          ingestionRunId: run.id,
          sectionId,
          sectionNumber: parsed.sectionNumber,
          missingFields: missingMetadata,
          details: {
            parserConfidence: parsed.parserConfidence,
            structureMatched: parsed.structureMatched,
          },
        },
      });
    }

    if (parsed.warnings.length > 0) {
      await prisma.parserWarningLog.createMany({
        data: parsed.warnings.map((warning) => ({
          ingestionRunId: run.id,
          sectionId,
          sectionNumber: parsed.sectionNumber,
          code: warning.code,
          severity: confidenceToSeverity(warning.confidence),
          message: warning.message,
          evidence: warning.evidence,
          details: warning.details
            ? (JSON.parse(JSON.stringify(warning.details)) as Prisma.InputJsonValue)
            : undefined,
        })),
      });
    }

    const warningCount = parsed.warnings.length;

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        ingestedCount: changed.changed ? 1 : 0,
        changedCount: changed.changed ? 1 : 0,
        warningCount,
        missingMetadataCount: missingMetadata.length > 0 ? 1 : 0,
        notes: changed.changed ? 'Section ingested and persisted.' : 'No content change detected.',
      },
    });

    return {
      runId: run.id,
      sectionNumber: parsed.sectionNumber,
      changed: changed.changed,
      warnings: parsed.warnings,
      parserConfidence: parsed.parserConfidence,
      structureMatched: parsed.structureMatched,
      missingMetadata,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingestion error';

    await prisma.parseFailureLog.create({
      data: {
        ingestionRunId: run.id,
        sectionNumber,
        url: sectionUrl(sectionNumber),
        errorMessage: message,
      },
    });

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        parseFailureCount: 1,
        notes: message,
      },
    });

    throw error;
  }
};

export const runSearchReindex = async () => {
  const sectionCount = await prisma.orcSection.count();
  const indexedCount = await prisma.orcSection.count({ where: { bodyText: { not: null } } });

  const run = await prisma.ingestionRun.create({
    data: {
      trigger: 'admin:reindex',
      status: 'SUCCESS',
      startedAt: new Date(),
      completedAt: new Date(),
      visitedCount: sectionCount,
      ingestedCount: indexedCount,
      notes: 'Search reindex requested from admin dashboard.',
    },
  });

  return {
    runId: run.id,
    sectionCount,
    indexedCount,
    coverage: sectionCount === 0 ? 0 : Number(((indexedCount / sectionCount) * 100).toFixed(2)),
  };
};
