-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN');

CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- CreateEnum
CREATE TYPE "SimilaritySource" AS ENUM ('CONTENT', 'COLLABORATIVE', 'HYBRID');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'ADD_TO_CART', 'PURCHASE', 'FILTER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'RETURN_REQUESTED';
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';

CREATE TABLE "product_categories" (
    "product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id", "category_id")
);

INSERT INTO "product_categories" ("product_id", "category_id", "created_at", "updated_at")
SELECT "id", "category_id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "products";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- DropIndex
DROP INDEX "products_status_category_id_idx";

-- AlterTable
ALTER TABLE "admin_users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "admin_users" ALTER COLUMN "role" TYPE "AdminRole" USING ('ADMIN'::"AdminRole");
ALTER TABLE "admin_users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "ai_usage" ALTER COLUMN "est_cost_micro_usd" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "bundle_id" UUID,
ADD COLUMN     "chat_session_id" UUID,
ALTER COLUMN "variant_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "coupon_redemptions" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "images" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "bundle_id" UUID;

-- AlterTable
ALTER TABLE "product_attributes" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "product_spaces" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "product_styles" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "content_hash" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false;
UPDATE "products" SET "is_active" = ("status" = 'ACTIVE');

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "spaces" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "styles" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "variant_attributes" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "variant_options" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_collections" (
    "product_id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_collections_pkey" PRIMARY KEY ("product_id","collection_id")
);

-- CreateTable
CREATE TABLE "scene_products" (
    "image_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "scene_products_pkey" PRIMARY KEY ("image_id","product_id")
);

-- CreateTable
CREATE TABLE "bundles" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discount_vnd" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_items" (
    "id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lighting_rules" (
    "room_type" TEXT NOT NULL,
    "lumen_per_m2" INTEGER NOT NULL,
    "notes" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lighting_rules_pkey" PRIMARY KEY ("room_type")
);

-- CreateTable
CREATE TABLE "order_complaints" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "reason_code" TEXT NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "order_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_chunks" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" vector(768),
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_embeddings" (
    "product_id" UUID NOT NULL,
    "embedding" vector(768),
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_embeddings_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "model_runs" (
    "id" UUID NOT NULL,
    "algorithm" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "data_version" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_similarity" (
    "product_id" UUID NOT NULL,
    "similar_id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "source" "SimilaritySource" NOT NULL,
    "model_run_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_similarity_pkey" PRIMARY KEY ("product_id","similar_id")
);

-- CreateTable
CREATE TABLE "interaction_events" (
    "id" UUID NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" UUID,
    "type" "InteractionType" NOT NULL,
    "product_id" UUID,
    "context" JSONB,
    "ts" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_events" (
    "id" UUID NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" UUID,
    "placement" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "algorithm" TEXT NOT NULL,
    "shown_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "added_to_cart" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "recommendation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "to_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_categories_category_id_product_id_idx" ON "product_categories"("category_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "product_collections_collection_id_product_id_idx" ON "product_collections"("collection_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "bundles_slug_key" ON "bundles"("slug");

-- CreateIndex
CREATE INDEX "bundle_items_bundle_id_idx" ON "bundle_items"("bundle_id");

-- CreateIndex
CREATE INDEX "order_complaints_order_id_created_at_idx" ON "order_complaints"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "content_chunks_source_source_id_idx" ON "content_chunks"("source", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_chunks_source_source_id_content_hash_key" ON "content_chunks"("source", "source_id", "content_hash");

-- CreateIndex
CREATE INDEX "model_runs_algorithm_is_active_idx" ON "model_runs"("algorithm", "is_active");

-- CreateIndex
CREATE INDEX "item_similarity_product_id_score_idx" ON "item_similarity"("product_id", "score");

-- CreateIndex
CREATE INDEX "interaction_events_session_id_ts_idx" ON "interaction_events"("session_id", "ts");

-- CreateIndex
CREATE INDEX "interaction_events_product_id_ts_idx" ON "interaction_events"("product_id", "ts");

-- CreateIndex
CREATE INDEX "recommendation_events_session_id_shown_at_idx" ON "recommendation_events"("session_id", "shown_at");

-- CreateIndex
CREATE INDEX "recommendation_events_placement_shown_at_idx" ON "recommendation_events"("placement", "shown_at");

-- CreateIndex
CREATE INDEX "contact_requests_status_created_at_idx" ON "contact_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "email_logs_status_created_at_idx" ON "email_logs"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_order_id_type_key" ON "email_logs"("order_id", "type");

-- CreateIndex
CREATE INDEX "cart_items_bundle_id_idx" ON "cart_items"("bundle_id");

-- CreateIndex
CREATE INDEX "products_status_is_active_idx" ON "products"("status", "is_active");

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_products" ADD CONSTRAINT "scene_products_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_products" ADD CONSTRAINT "scene_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_complaints" ADD CONSTRAINT "order_complaints_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_embeddings" ADD CONSTRAINT "product_embeddings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_similarity" ADD CONSTRAINT "item_similarity_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_similarity" ADD CONSTRAINT "item_similarity_similar_id_fkey" FOREIGN KEY ("similar_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_similarity" ADD CONSTRAINT "item_similarity_model_run_id_fkey" FOREIGN KEY ("model_run_id") REFERENCES "model_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_events" ADD CONSTRAINT "interaction_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_events" ADD CONSTRAINT "interaction_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_events" ADD CONSTRAINT "recommendation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_events" ADD CONSTRAINT "recommendation_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" DROP COLUMN "category_id";
ALTER TABLE "images" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "product_attributes" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "product_spaces" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "product_styles" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "variant_attributes" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "variant_options" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_exactly_one_target_check" CHECK (num_nonnulls("variant_id", "bundle_id") = 1);
CREATE UNIQUE INDEX "cart_items_cart_id_bundle_id_key" ON "cart_items"("cart_id", "bundle_id");
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_exactly_one_target_check" CHECK (num_nonnulls("product_id", "variant_id") = 1);
ALTER TABLE "variants" ADD CONSTRAINT "variants_price_stock_nonnegative_check" CHECK ("price_vnd" >= 0 AND "stock_qty" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_active_status_consistency_check" CHECK (("status" = 'ACTIVE') = "is_active");

CREATE INDEX "products_name_unaccent_trgm_idx" ON "products" USING GIN (public.immutable_unaccent(lower("name")) gin_trgm_ops);
CREATE INDEX "products_description_unaccent_trgm_idx" ON "products" USING GIN (public.immutable_unaccent(lower("description")) gin_trgm_ops);
CREATE INDEX "content_chunks_embedding_hnsw_idx" ON "content_chunks" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "product_embeddings_embedding_hnsw_idx" ON "product_embeddings" USING hnsw ("embedding" vector_cosine_ops);
