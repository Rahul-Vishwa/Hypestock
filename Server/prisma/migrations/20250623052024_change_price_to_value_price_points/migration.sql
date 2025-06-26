/*
  Warnings:

  - You are about to drop the column `price` on the `PricePoints` table. All the data in the column will be lost.
  - Added the required column `value` to the `PricePoints` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PricePoints" DROP COLUMN "price",
ADD COLUMN     "value" INTEGER NOT NULL;
