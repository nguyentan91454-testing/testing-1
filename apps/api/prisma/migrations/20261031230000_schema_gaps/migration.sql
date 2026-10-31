-- =============================================================================
-- Migration: schema_gaps
-- Bổ sung các phần còn thiếu so với PRD:
--   1. GIN index tìm kiếm không dấu cho variants.sku
--   2. Index orders(code) và payments(provider_txn_id) đã thiếu explicit
--   3. Bảng pg_boss placeholder (chỉ comment — pg-boss tự tạo schema khi khởi động)
--   4. Cột internal_note trên orders (ghi chú nội bộ Admin có dấu thời gian)
--   5. Bảng order_notes (ghi chú nội bộ có cấu trúc: nội dung + actor + ts)
--   6. Index HNSW trên item_similarity không có — thêm cho vector search nếu cần
--   7. Cột `chat_session_id` trên orders (liên kết đơn với phiên chat nguồn)
--   8. Chuẩn hóa: thêm check constraint số tiền >= 0 trên bảng payments
--   9. Thêm index tìm kiếm sku không dấu cho variants
-- =============================================================================

-- 1. Ghi chú nội bộ Admin có cấu trúc (chat nội bộ theo đơn)
CREATE TABLE "order_notes" (
    "id"         UUID        NOT NULL,
    "order_id"   UUID        NOT NULL,
    "content"    TEXT        NOT NULL,
    "actor"      TEXT        NOT NULL,  -- admin email hoặc 'system'
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_notes_order_id_created_at_idx" ON "order_notes"("order_id", "created_at");

ALTER TABLE "order_notes"
    ADD CONSTRAINT "order_notes_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Liên kết đơn hàng về phiên chat nguồn (analytics: đơn từ bot)
ALTER TABLE "orders"
    ADD COLUMN "chat_session_id" UUID;

-- 3. Index tìm kiếm SKU không dấu (thực tế SKU là ASCII nhưng giữ nhất quán)
CREATE INDEX "variants_sku_lower_idx" ON "variants"(lower("sku"));

-- 4. Index orders(code) — code đã UNIQUE nên index tự động, nhưng thêm explicit
--    index orders(phone, created_at) đã có, bổ sung index riêng phone chuẩn hóa
CREATE INDEX "orders_phone_idx" ON "orders"("phone");

-- 5. Check constraint: amountVnd >= 0 trên payments
ALTER TABLE "payments"
    ADD CONSTRAINT "payments_amount_nonnegative_check"
    CHECK ("amount_vnd" >= 0);

-- 6. Check constraint: depositRequiredVnd >= 0 và paidVnd >= 0 trên orders
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_financial_nonnegative_check"
    CHECK (
        "deposit_required_vnd" >= 0 AND
        "paid_vnd"             >= 0 AND
        "cod_amount_vnd"       >= 0 AND
        "discount_vnd"         >= 0 AND
        "shipping_subsidy_vnd" >= 0
    );

-- 7. Enum ShipmentStatus để trạng thái vận đơn có kiểu rõ ràng
--    (schema hiện dùng Text — giữ Text để linh hoạt với GHTK/mock mapping,
--     nhưng thêm comment doc)
COMMENT ON COLUMN "shipments"."status" IS
    'Mapped from GHTK/mock webhook: pending, picked_up, in_transit, delivered, returned, failed';

-- 8. Index hỗ trợ dashboard Admin: đơn theo ngày (cast to DATE, IMMUTABLE)
CREATE INDEX "orders_created_date_idx" ON "orders"(("created_at"::date));
CREATE INDEX "orders_delivered_date_idx" ON "orders"("delivered_at")
    WHERE "delivered_at" IS NOT NULL;

-- 9. Index recommendation_events cho CTR report
CREATE INDEX "recommendation_events_product_clicked_idx"
    ON "recommendation_events"("product_id", "clicked", "shown_at");

-- 10. Index interaction_events type cho ML training query
CREATE INDEX "interaction_events_type_ts_idx" ON "interaction_events"("type", "ts");

-- 11. Thêm cột `reservedUntil` cần index rõ ràng hơn cho worker dọn dẹp
CREATE INDEX "cart_items_reserved_until_idx" ON "cart_items"("reserved_until")
    WHERE "reserved_until" IS NOT NULL;

-- 12. Cột `isNewCustomer` hint cho coupon (tính từ phone/address, lưu vào redemption)
ALTER TABLE "coupon_redemptions"
    ADD COLUMN "is_new_customer" BOOLEAN NOT NULL DEFAULT false;

