-- Idempotency-Key for POST /api/orders (one order per user and key).
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "requestHash" TEXT;

CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order"("userId", "idempotencyKey");

-- Payment replay support: request fingerprint and failure reason.
ALTER TABLE "Payment" ADD COLUMN "requestHash" TEXT,
ADD COLUMN "failureReason" TEXT;
