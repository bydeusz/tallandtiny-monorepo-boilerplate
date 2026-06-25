-- AlterEnum
BEGIN;
CREATE TYPE "FileScope_new" AS ENUM ('USER');
ALTER TABLE "File" ALTER COLUMN "scope" TYPE "FileScope_new" USING ("scope"::text::"FileScope_new");
ALTER TYPE "FileScope" RENAME TO "FileScope_old";
ALTER TYPE "FileScope_new" RENAME TO "FileScope";
DROP TYPE "public"."FileScope_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_organisationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganisationMember" DROP CONSTRAINT "OrganisationMember_organisationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganisationMember" DROP CONSTRAINT "OrganisationMember_userId_fkey";

-- DropIndex
DROP INDEX "File_organisationId_idx";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "organisationId";

-- DropTable
DROP TABLE "Organisation";

-- DropTable
DROP TABLE "OrganisationMember";

-- DropEnum
DROP TYPE "OrganisationRole";
