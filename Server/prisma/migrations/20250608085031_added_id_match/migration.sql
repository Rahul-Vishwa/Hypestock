-- AlterTable
ALTER TABLE "Match" ADD CONSTRAINT "Match_pkey" PRIMARY KEY ("id");

-- DropIndex
DROP INDEX "Match_id_key";
