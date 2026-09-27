-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'viewer';

-- AlterTable
ALTER TABLE "organization" ADD COLUMN "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organization_inviteCode_key" ON "organization"("inviteCode");
