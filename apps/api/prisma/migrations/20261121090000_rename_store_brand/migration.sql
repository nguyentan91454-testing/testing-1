UPDATE "brands"
SET "name" = 'Konyappi Shop', "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'nha-minh' AND LOWER("name") = 'nhà mình';
