-- CreateTable
CREATE TABLE "Match" (
    "date" TEXT NOT NULL,
    "dateTimeGMT" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "matchEnded" BOOLEAN NOT NULL,
    "matchStarted" BOOLEAN NOT NULL,
    "matchType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "teams" TEXT[],
    "venue" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_id_key" ON "Match"("id");
