-- Voucher data sanity: counters never negative, values positive, percent at most 100.
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_usedCount_nonnegative" CHECK ("usedCount" >= 0),
ADD CONSTRAINT "Voucher_value_positive" CHECK ("value" > 0),
ADD CONSTRAINT "Voucher_percent_max_100" CHECK ("type" <> 'PERCENT' OR "value" <= 100);
