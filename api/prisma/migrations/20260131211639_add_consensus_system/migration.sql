-- CreateTable
CREATE TABLE "ExceptionVote" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExceptionVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExceptionVote_assetId_idx" ON "ExceptionVote"("assetId");

-- CreateIndex
CREATE INDEX "ExceptionVote_trustId_idx" ON "ExceptionVote"("trustId");

-- CreateIndex
CREATE INDEX "ExceptionVote_voterId_idx" ON "ExceptionVote"("voterId");

-- CreateIndex
CREATE INDEX "ExceptionVote_vote_idx" ON "ExceptionVote"("vote");

-- CreateIndex
CREATE INDEX "ExceptionVote_createdAt_idx" ON "ExceptionVote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExceptionVote_assetId_voterId_key" ON "ExceptionVote"("assetId", "voterId");

-- AddForeignKey
ALTER TABLE "ExceptionVote" ADD CONSTRAINT "ExceptionVote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionVote" ADD CONSTRAINT "ExceptionVote_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionVote" ADD CONSTRAINT "ExceptionVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
