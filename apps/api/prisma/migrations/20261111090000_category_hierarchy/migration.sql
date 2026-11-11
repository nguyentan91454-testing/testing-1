ALTER TABLE "categories" ADD COLUMN "parent_id" UUID;

CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
