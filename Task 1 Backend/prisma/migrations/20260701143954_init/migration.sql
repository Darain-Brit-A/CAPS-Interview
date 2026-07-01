-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApodDaily" (
    "date" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "hdurl" TEXT,
    "copyright" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobName" TEXT NOT NULL,
    "targetDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "errorMessage" TEXT
);

-- CreateIndex
CREATE INDEX "Favorite_sourceType_idx" ON "Favorite"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_sourceType_sourceId_key" ON "Favorite"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "JobRun_jobName_targetDate_key" ON "JobRun"("jobName", "targetDate");
