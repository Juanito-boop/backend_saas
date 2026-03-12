CREATE TABLE "notification_webhooks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "team_id" uuid NOT NULL,
    "name" varchar(100) NOT NULL,
    "provider" varchar(20) NOT NULL,
    "url" text NOT NULL,
    "event_types" json,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_by" uuid NOT NULL,
    "last_delivered_at" timestamp,
    "last_error" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "notification_webhooks"
ADD CONSTRAINT "notification_webhooks_team_id_teams_id_fk"
FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "notification_webhooks"
ADD CONSTRAINT "notification_webhooks_created_by_users_id_fk"
FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "idx_notification_webhooks_team_id" ON "notification_webhooks" ("team_id");

CREATE INDEX "idx_notification_webhooks_enabled" ON "notification_webhooks" ("enabled");

CREATE TABLE "notification_webhook_deliveries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "webhook_id" uuid NOT NULL,
    "team_id" uuid NOT NULL,
    "notification_id" uuid,
    "event_type" varchar(50) NOT NULL,
    "success" boolean NOT NULL,
    "status_code" integer,
    "request_body" json,
    "response_body" text,
    "error" text,
    "attempted_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "notification_webhook_deliveries"
ADD CONSTRAINT "notification_webhook_deliveries_webhook_id_notification_webhooks_id_fk"
FOREIGN KEY ("webhook_id") REFERENCES "public"."notification_webhooks"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "notification_webhook_deliveries"
ADD CONSTRAINT "notification_webhook_deliveries_team_id_teams_id_fk"
FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "notification_webhook_deliveries"
ADD CONSTRAINT "notification_webhook_deliveries_notification_id_notifications_id_fk"
FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "idx_notification_webhook_deliveries_webhook_id" ON "notification_webhook_deliveries" ("webhook_id");

CREATE INDEX "idx_notification_webhook_deliveries_team_id" ON "notification_webhook_deliveries" ("team_id");

CREATE INDEX "idx_notification_webhook_deliveries_notification_id" ON "notification_webhook_deliveries" ("notification_id");