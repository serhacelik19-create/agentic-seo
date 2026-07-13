-- CreateTable
CREATE TABLE "CompetitorAnalysis" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "competitors" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outline" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "headings" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "seoScore" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "publishedUrl" TEXT,
    "featuredImage" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "googleRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutopilotKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutopilotKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorAnalysis_keyword_key" ON "CompetitorAnalysis"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "Outline_keyword_key" ON "Outline"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "Article_keyword_key" ON "Article"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "AutopilotKeyword_keyword_key" ON "AutopilotKeyword"("keyword");
