-- CreateEnum
CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ParserWarningSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" "IngestionRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "visitedCount" INTEGER NOT NULL DEFAULT 0,
    "ingestedCount" INTEGER NOT NULL DEFAULT 0,
    "changedCount" INTEGER NOT NULL DEFAULT 0,
    "parseFailureCount" INTEGER NOT NULL DEFAULT 0,
    "missingMetadataCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangedStatute" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "sectionId" TEXT,
    "sectionNumber" TEXT NOT NULL,
    "oldHash" TEXT,
    "newHash" TEXT NOT NULL,
    "previousVersion" INTEGER,
    "nextVersion" INTEGER,
    "diffSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChangedStatute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParseFailureLog" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "sectionNumber" TEXT,
    "url" TEXT,
    "errorMessage" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParseFailureLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissingMetadataLog" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "sectionId" TEXT,
    "sectionNumber" TEXT NOT NULL,
    "missingFields" JSONB NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissingMetadataLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParserWarningLog" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "sectionId" TEXT,
    "sectionNumber" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "ParserWarningSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "evidence" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParserWarningLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestionRun_startedAt_idx" ON "IngestionRun"("startedAt");

-- CreateIndex
CREATE INDEX "IngestionRun_status_startedAt_idx" ON "IngestionRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "ChangedStatute_ingestionRunId_sectionNumber_idx" ON "ChangedStatute"("ingestionRunId", "sectionNumber");

-- CreateIndex
CREATE INDEX "ParseFailureLog_ingestionRunId_createdAt_idx" ON "ParseFailureLog"("ingestionRunId", "createdAt");

-- CreateIndex
CREATE INDEX "MissingMetadataLog_ingestionRunId_sectionNumber_idx" ON "MissingMetadataLog"("ingestionRunId", "sectionNumber");

-- CreateIndex
CREATE INDEX "ParserWarningLog_ingestionRunId_sectionNumber_idx" ON "ParserWarningLog"("ingestionRunId", "sectionNumber");

-- CreateIndex
CREATE INDEX "ParserWarningLog_severity_createdAt_idx" ON "ParserWarningLog"("severity", "createdAt");

-- AddForeignKey
ALTER TABLE "ChangedStatute" ADD CONSTRAINT "ChangedStatute_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParseFailureLog" ADD CONSTRAINT "ParseFailureLog_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissingMetadataLog" ADD CONSTRAINT "MissingMetadataLog_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParserWarningLog" ADD CONSTRAINT "ParserWarningLog_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
