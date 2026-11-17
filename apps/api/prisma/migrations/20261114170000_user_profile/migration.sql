-- Optional default contact/address; recipient phones are not login identities.
ALTER TABLE "users"
ADD COLUMN "phone" TEXT,
ADD COLUMN "province" TEXT,
ADD COLUMN "ward" TEXT,
ADD COLUMN "address_detail" TEXT;
