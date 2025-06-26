-- CreateTable
CREATE TABLE "PricePoints" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "time" INTEGER NOT NULL,

    CONSTRAINT "PricePoints_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PricePoints" ADD CONSTRAINT "PricePoints_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
