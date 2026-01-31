-- CreateTable
CREATE TABLE "ComiteSession" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "sessionType" TEXT NOT NULL,
    "attendees" TEXT[],
    "quorum" BOOLEAN NOT NULL DEFAULT false,
    "agenda" JSONB,
    "decisions" JSONB,
    "approvedItems" TEXT[],
    "minutes" TEXT,
    "minutesUrl" TEXT,
    "minutesHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledBy" TEXT,
    "location" TEXT,
    "meetingLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComiteSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComiteSession_trustId_idx" ON "ComiteSession"("trustId");

-- CreateIndex
CREATE INDEX "ComiteSession_sessionDate_idx" ON "ComiteSession"("sessionDate");

-- CreateIndex
CREATE INDEX "ComiteSession_status_idx" ON "ComiteSession"("status");

-- CreateIndex
CREATE INDEX "ComiteSession_sessionType_idx" ON "ComiteSession"("sessionType");

-- AddForeignKey
ALTER TABLE "ComiteSession" ADD CONSTRAINT "ComiteSession_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;
