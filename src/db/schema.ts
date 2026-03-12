import { boolean, index, integer, json, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

/* ======================================================
USERS
====================================================== */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).default("").notNull(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const accounts = pgTable("account", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
},
  (table) => [
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
    index("idx_account_user_id").on(table.userId)
  ]
);

export const sessions = pgTable("session", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
},
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("idx_session_user_id").on(table.userId)
  ]
);

export const verifications = pgTable("verification", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
},
  (table) => [
    uniqueIndex("verification_identifier_value_unique").on(table.identifier, table.value)
  ]
);

export const authSchema = {
  user: users,
  account: accounts,
  session: sessions,
  verification: verifications
};

/* ======================================================
TEAMS
====================================================== */

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  plan: varchar("plan", { length: 30 }).default("starter").notNull(),
  urlLimit: integer("url_limit").default(20).notNull(),
  userLimit: integer("user_limit").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

/* ======================================================
TEAM MEMBERS
====================================================== */

export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
},
  (table) => [
    index("idx_team_members_team_id").on(table.teamId),
    index("idx_team_members_user_id").on(table.userId)
  ]
);

/* ======================================================
DOMAINS
====================================================== */

export const domains = pgTable("domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  hostname: varchar("hostname", { length: 253 }).notNull().unique(),
  requestIntervalMs: integer("request_interval_ms").default(5000).notNull(),
  lastRequestAt: timestamp("last_request_at"),
  blockedUntil: timestamp("blocked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

/* ======================================================
PRODUCTS
====================================================== */

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  domainId: uuid("domain_id").references(() => domains.id).notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  name: varchar("name", { length: 200 }),
  url: text("url").notNull(),
  selector: varchar("selector", { length: 200 }).notNull(),
  xpathSelector: varchar("xpath_selector", { length: 300 }),
  regexPattern: varchar("regex_pattern", { length: 200 }),
  jsonPath: varchar("json_path", { length: 200 }),
  scrapeStrategy: varchar("scrape_strategy", { length: 30 }).default("browser").notNull(),
  htmlHash: varchar("html_hash", { length: 64 }),
  lastPrice: varchar("last_price", { length: 20 }),
  lastCheckedAt: timestamp("last_checked_at"),
  lastPriceChangedAt: timestamp("last_price_changed_at"),
  lastScrapeError: text("last_scrape_error"),
  currency: varchar("currency", { length: 10 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
},
  (table) => [
    index("idx_products_team_id").on(table.teamId),
    index("idx_products_domain_id").on(table.domainId)
  ]
);


/* ======================================================
PRICE HISTORY
====================================================== */

export const priceHistory = pgTable("price_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  price: varchar("price", { length: 20 }).notNull(),
  currency: varchar("currency", { length: 10 }),
  checkedAt: timestamp("checked_at").defaultNow().notNull()
},
  (table) => [
    index("idx_price_history_product_id").on(table.productId)
  ]
);

export const priceHistoryHourly = pgTable("price_history_hourly", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  bucketStart: timestamp("bucket_start").notNull(),
  sampleCount: integer("sample_count").default(0).notNull(),
  successCount: integer("success_count").default(0).notNull(),
  failureCount: integer("failure_count").default(0).notNull(),
  firstPrice: varchar("first_price", { length: 20 }),
  minPrice: varchar("min_price", { length: 20 }),
  maxPrice: varchar("max_price", { length: 20 }),
  lastPrice: varchar("last_price", { length: 20 }),
  currency: varchar("currency", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
},
  (table) => [
    uniqueIndex("price_history_hourly_product_bucket_unique").on(table.productId, table.bucketStart),
    index("idx_price_history_hourly_product_id").on(table.productId)
  ]
);

export const priceHistoryDaily = pgTable("price_history_daily", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  bucketStart: timestamp("bucket_start").notNull(),
  sampleCount: integer("sample_count").default(0).notNull(),
  successCount: integer("success_count").default(0).notNull(),
  failureCount: integer("failure_count").default(0).notNull(),
  firstPrice: varchar("first_price", { length: 20 }),
  minPrice: varchar("min_price", { length: 20 }),
  maxPrice: varchar("max_price", { length: 20 }),
  lastPrice: varchar("last_price", { length: 20 }),
  currency: varchar("currency", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
},
  (table) => [
    uniqueIndex("price_history_daily_product_bucket_unique").on(table.productId, table.bucketStart),
    index("idx_price_history_daily_product_id").on(table.productId)
  ]
);

/* ======================================================
ALERTS
====================================================== */

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  conditionType: varchar("condition_type", { length: 30 }).notNull(),
  conditionValue: varchar("condition_value", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

/* ======================================================
SUBSCRIPTIONS
====================================================== */

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  provider: varchar("provider", { length: 30 }).notNull(),
  providerSubscriptionId: text("provider_subscription_id"),
  status: varchar("status", { length: 30 }).notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull()
},
  (table) => [
    index("idx_subscriptions_team_id").on(table.teamId)
  ]
);

/* ======================================================
NOTIFICATIONS
====================================================== */

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull()
},
  (table) => [
    index("idx_notifications_user_id").on(table.userId)
  ]
);

export const notificationWebhooks = pgTable("notification_webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 20 }).notNull(),
  url: text("url").notNull(),
  eventTypes: json("event_types"),
  enabled: boolean("enabled").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  lastDeliveredAt: timestamp("last_delivered_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
},
  (table) => [
    index("idx_notification_webhooks_team_id").on(table.teamId),
    index("idx_notification_webhooks_enabled").on(table.enabled)
  ]
);

export const notificationWebhookDeliveries = pgTable("notification_webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  webhookId: uuid("webhook_id").references(() => notificationWebhooks.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  notificationId: uuid("notification_id").references(() => notifications.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  success: boolean("success").notNull(),
  statusCode: integer("status_code"),
  requestBody: json("request_body"),
  responseBody: text("response_body"),
  error: text("error"),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull()
},
  (table) => [
    index("idx_notification_webhook_deliveries_webhook_id").on(table.webhookId),
    index("idx_notification_webhook_deliveries_team_id").on(table.teamId),
    index("idx_notification_webhook_deliveries_notification_id").on(table.notificationId)
  ]
);

/* ======================================================
ACTIVITY LOG
====================================================== */

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull()
},
  (table) => [
    index("idx_activity_log_team_id").on(table.teamId)
  ]
);

/* ======================================================
SCRAPING JOBS
====================================================== */

export const scrapeJobs = pgTable("scrape_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  workerId: varchar("worker_id", { length: 100 }),
  domainId: uuid("domain_id").references(() => domains.id).notNull(),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
},
  (table) => [
    index("idx_scrape_jobs_product_id").on(table.productId),
    index("idx_scrape_jobs_status").on(table.status)
  ]
);

/* ======================================================
SCRAPE RESULTS
====================================================== */

export const scrapeResults = pgTable("scrape_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").references(() => scrapeJobs.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  success: boolean("success").notNull(),
  price: varchar("price", { length: 20 }),
  currency: varchar("currency", { length: 10 }),
  error: text("error"),
  responseTimeMs: integer("response_time_ms"),
  retentionUntil: timestamp("retention_until"),
  checkedAt: timestamp("checked_at").defaultNow().notNull()
},
  (table) => [
    index("idx_scrape_results_product_id").on(table.productId),
    index("idx_scrape_results_retention_until").on(table.retentionUntil)
  ]
);

/* ======================================================
WORKERS
====================================================== */

export const workers = pgTable("workers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  lastHeartbeat: timestamp("last_heartbeat"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
