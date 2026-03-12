ALTER TABLE "products"
ADD COLUMN "last_price_changed_at" timestamp,
ADD COLUMN "last_scrape_error" text;

ALTER TABLE "price_history" ADD COLUMN "currency" varchar(10);

ALTER TABLE "scrape_results"
ADD COLUMN "currency" varchar(10),
ADD COLUMN "retention_until" timestamp;

CREATE INDEX "idx_scrape_results_retention_until" ON "scrape_results" ("retention_until");

CREATE TABLE "price_history_hourly" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "product_id" uuid NOT NULL,
    "bucket_start" timestamp NOT NULL,
    "sample_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "first_price" varchar(20),
    "min_price" varchar(20),
    "max_price" varchar(20),
    "last_price" varchar(20),
    "currency" varchar(10),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "price_history_hourly"
ADD CONSTRAINT "price_history_hourly_product_id_products_id_fk"
FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "price_history_hourly_product_bucket_unique" ON "price_history_hourly" ("product_id", "bucket_start");

CREATE INDEX "idx_price_history_hourly_product_id" ON "price_history_hourly" ("product_id");

CREATE TABLE "price_history_daily" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "product_id" uuid NOT NULL,
    "bucket_start" timestamp NOT NULL,
    "sample_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "first_price" varchar(20),
    "min_price" varchar(20),
    "max_price" varchar(20),
    "last_price" varchar(20),
    "currency" varchar(10),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "price_history_daily"
ADD CONSTRAINT "price_history_daily_product_id_products_id_fk"
FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "price_history_daily_product_bucket_unique" ON "price_history_daily" ("product_id", "bucket_start");

CREATE INDEX "idx_price_history_daily_product_id" ON "price_history_daily" ("product_id");