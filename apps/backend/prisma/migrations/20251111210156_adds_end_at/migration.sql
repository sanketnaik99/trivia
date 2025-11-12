-- AlterTable
ALTER TABLE "scheduled_games" ADD COLUMN     "endAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "scheduled_games_groupId_endAt_idx" ON "scheduled_games"("groupId", "endAt");
