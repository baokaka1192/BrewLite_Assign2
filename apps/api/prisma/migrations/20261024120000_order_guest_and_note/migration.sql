-- AlterTable: guest orders have no user; add free-text note
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL,
ADD COLUMN "note" TEXT;
