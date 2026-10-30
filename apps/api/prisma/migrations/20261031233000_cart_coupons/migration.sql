ALTER TABLE "carts" ADD COLUMN "coupon_id" UUID;
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_id_fkey"
  FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD COLUMN "new_customer_only" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "carts_coupon_id_idx" ON "carts"("coupon_id");
