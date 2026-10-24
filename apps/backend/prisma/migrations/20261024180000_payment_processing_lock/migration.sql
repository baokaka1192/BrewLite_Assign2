-- At most one in-flight (PROCESSING) payment per order. A concurrent second
-- payment attempt violates this index and is rejected before any gateway call.
CREATE UNIQUE INDEX "Payment_orderId_processing_key" ON "Payment"("orderId") WHERE "status" = 'PROCESSING';
