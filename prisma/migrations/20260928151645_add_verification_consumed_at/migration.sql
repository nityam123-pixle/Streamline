-- AlterTable
ALTER TABLE "user" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "verification" ADD COLUMN     "consumedAt" TIMESTAMP(3);
