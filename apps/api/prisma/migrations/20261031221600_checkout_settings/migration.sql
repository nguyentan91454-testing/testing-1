ALTER TABLE "orders" ADD COLUMN "idempotency_key" TEXT;
UPDATE "orders" SET "idempotency_key" = gen_random_uuid()::text WHERE "idempotency_key" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "idempotency_key" SET NOT NULL;
ALTER TABLE "orders" ADD COLUMN "reservation_expires_at" TIMESTAMPTZ;
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

CREATE TABLE "settings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "customer_risk" (
  "phone" TEXT NOT NULL,
  "delivered_count" INTEGER NOT NULL DEFAULT 0,
  "returned_count" INTEGER NOT NULL DEFAULT 0,
  "boom_count" INTEGER NOT NULL DEFAULT 0,
  "last_event_at" TIMESTAMPTZ,
  CONSTRAINT "customer_risk_pkey" PRIMARY KEY ("phone")
);
