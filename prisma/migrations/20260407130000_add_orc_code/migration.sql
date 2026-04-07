-- CreateTable
CREATE TABLE "OrcCode" (
    "id" TEXT NOT NULL,
    "sectionNumber" TEXT NOT NULL,
    "titleNumber" TEXT,
    "titleName" TEXT,
    "chapterNumber" TEXT,
    "chapterName" TEXT,
    "body" TEXT NOT NULL,
    "plainText" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrcCode_sectionNumber_key" ON "OrcCode"("sectionNumber");

-- CreateIndex
CREATE INDEX "OrcCode_sectionNumber_idx" ON "OrcCode"("sectionNumber");

-- CreateIndex
CREATE INDEX "OrcCode_chapterNumber_idx" ON "OrcCode"("chapterNumber");

-- CreateIndex
CREATE INDEX "OrcCode_titleNumber_idx" ON "OrcCode"("titleNumber");

-- CreateIndex
CREATE INDEX "OrcCode_plainText_fts_idx"
  ON "OrcCode"
  USING GIN (to_tsvector('english', "plainText"));
