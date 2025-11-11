-- CreateEnum
CREATE TYPE "ScheduledGameStatus" AS ENUM ('SCHEDULED', 'STARTED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "scheduled_games" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "recurrence" JSONB,
    "status" "ScheduledGameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "roomId" TEXT,
    "notificationsSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_games_groupId_startAt_idx" ON "scheduled_games"("groupId", "startAt");

-- CreateIndex
CREATE INDEX "scheduled_games_startAt_idx" ON "scheduled_games"("startAt");

-- AddForeignKey
ALTER TABLE "scheduled_games" ADD CONSTRAINT "scheduled_games_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_games" ADD CONSTRAINT "scheduled_games_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
