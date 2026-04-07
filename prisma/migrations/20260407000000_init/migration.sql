-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'EDITOR', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "agencyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcTitle" (
    "id" TEXT NOT NULL,
    "titleNumber" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parsedNodes" JSONB,
    "renderBlocks" JSONB,
    "tags" JSONB,
    "aliases" JSONB,
    "sourceHash" TEXT,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceUpdatedAt" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcChapter" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "chapterNumber" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parsedNodes" JSONB,
    "renderBlocks" JSONB,
    "tags" JSONB,
    "aliases" JSONB,
    "sourceHash" TEXT,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceUpdatedAt" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcSection" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "sectionNumber" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "bodyText" TEXT,
    "parsedNodes" JSONB,
    "renderBlocks" JSONB,
    "tags" JSONB,
    "aliases" JSONB,
    "sourceHash" TEXT,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceUpdatedAt" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossReference" (
    "id" TEXT NOT NULL,
    "sourceSectionId" TEXT NOT NULL,
    "targetSectionId" TEXT,
    "citationText" TEXT NOT NULL,
    "targetLabel" TEXT,
    "targetUrl" TEXT,
    "parsedNodes" JSONB,
    "tags" JSONB,
    "sourceHash" TEXT,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "ingestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinOrder" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "resultMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OrcTitle_titleNumber_key" ON "OrcTitle"("titleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrcTitle_slug_key" ON "OrcTitle"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrcChapter_titleId_chapterNumber_key" ON "OrcChapter"("titleId", "chapterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrcChapter_titleId_slug_key" ON "OrcChapter"("titleId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrcSection_chapterId_sectionNumber_key" ON "OrcSection"("chapterId", "sectionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrcSection_titleId_slug_key" ON "OrcSection"("titleId", "slug");

-- CreateIndex
CREATE INDEX "CrossReference_sourceSectionId_idx" ON "CrossReference"("sourceSectionId");

-- CreateIndex
CREATE INDEX "CrossReference_targetSectionId_idx" ON "CrossReference"("targetSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_sectionId_key" ON "Favorite"("userId", "sectionId");

-- CreateIndex
CREATE INDEX "Favorite_userId_pinned_pinOrder_idx" ON "Favorite"("userId", "pinned", "pinOrder");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchHistory_query_idx" ON "SearchHistory"("query");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcChapter" ADD CONSTRAINT "OrcChapter_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "OrcTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcSection" ADD CONSTRAINT "OrcSection_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "OrcTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcSection" ADD CONSTRAINT "OrcSection_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "OrcChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossReference" ADD CONSTRAINT "CrossReference_sourceSectionId_fkey" FOREIGN KEY ("sourceSectionId") REFERENCES "OrcSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossReference" ADD CONSTRAINT "CrossReference_targetSectionId_fkey" FOREIGN KEY ("targetSectionId") REFERENCES "OrcSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "OrcSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
