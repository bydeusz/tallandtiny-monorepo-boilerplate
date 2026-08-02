-- AlterEnum
-- OWNER and ADMIN were the same thing in practice: both could change anything
-- about the organisation. The two are collapsed into a single ADMIN role.
--
-- Renaming the value rather than dropping and recreating the type keeps every
-- existing membership row intact and needs no data backfill: today's owners
-- simply become admins, which is what they already were permission-wise.
ALTER TYPE "OrganisationRole" RENAME VALUE 'OWNER' TO 'ADMIN';
