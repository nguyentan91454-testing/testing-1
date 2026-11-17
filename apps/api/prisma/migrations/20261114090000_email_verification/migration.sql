ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMPTZ;

-- Only legacy Google-only accounts have trustworthy proof of email ownership.
UPDATE "users" SET "email_verified_at" = "created_at"
WHERE "google_sub" IS NOT NULL AND "password_hash" IS NULL;

-- Previous password registrations could create sessions without email verification.
UPDATE "customer_sessions" SET "revoked_at" = CURRENT_TIMESTAMP
WHERE "revoked_at" IS NULL AND "user_id" IN (
  SELECT "id" FROM "users" WHERE "email_verified_at" IS NULL
);
