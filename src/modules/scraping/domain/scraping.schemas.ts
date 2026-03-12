import { z } from 'zod';

export const productScrapeContextSchema = z.object({
  productId: z.string().uuid(),
  teamId: z.string().uuid(),
  domainId: z.string().uuid(),
});

export const scrapeJobRecordSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  status: z.string(),
  scheduledAt: z.date(),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  workerId: z.string().nullable(),
  domainId: z.string().uuid(),
  retryCount: z.number().int().nullable(),
  createdAt: z.date(),
});

export const scrapeResultRecordSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  productId: z.string().uuid(),
  success: z.boolean(),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  error: z.string().nullable(),
  responseTimeMs: z.number().int().nullable(),
  retentionUntil: z.date().nullable(),
  checkedAt: z.date(),
});

export const priceHistoryAggregateSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  bucketStart: z.date(),
  sampleCount: z.number().int(),
  successCount: z.number().int(),
  failureCount: z.number().int(),
  firstPrice: z.string().nullable(),
  minPrice: z.string().nullable(),
  maxPrice: z.string().nullable(),
  lastPrice: z.string().nullable(),
  currency: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const scheduleScrapeBodySchema = z.object({
  productId: z.string().uuid(),
  domainId: z.string().uuid(),
});

export const productHistoryQuerySchema = z.object({
  resolution: z.enum(['change', 'hour', 'day']).default('change'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

export const productHistoryPointSchema = z.object({
  resolution: z.enum(['change', 'hour', 'day']),
  bucketStart: z.date(),
  bucketEnd: z.date().nullable(),
  sampleCount: z.number().int(),
  successCount: z.number().int(),
  failureCount: z.number().int(),
  price: z.string().nullable(),
  firstPrice: z.string().nullable(),
  minPrice: z.string().nullable(),
  maxPrice: z.string().nullable(),
  lastPrice: z.string().nullable(),
  currency: z.string().nullable(),
});

export const productHistoryPointListSchema = z.array(productHistoryPointSchema);

export const recordScrapeObservationInputSchema = z.object({
  scrapeJobId: z.string().uuid(),
  productId: z.string().uuid(),
  workerId: z.string().max(100).optional(),
  success: z.boolean(),
  checkedAt: z.date(),
  responseTimeMs: z.number().int().min(0).optional(),
  price: z.string().trim().min(1).max(20).optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  error: z.string().trim().min(1).optional(),
  htmlHash: z.string().trim().min(1).max(64).optional(),
});

export const recordScrapeObservationResultSchema = z.object({
  rawResult: scrapeResultRecordSchema,
  priceChanged: z.boolean(),
});

export const queueDispatchResultSchema = z.object({
  queueJobId: z.string().optional(),
  queueName: z.string(),
  queueJobName: z.string(),
});

export const scheduleScrapeResultSchema = z.object({
  jobId: z.string().optional(),
  queue: z.string(),
  name: z.string(),
  status: z.literal('queued'),
  data: z.object({
    scrapeJobId: z.string().uuid(),
    productId: z.string().uuid(),
    domainId: z.string().uuid(),
  }),
});

export const scrapeJobRecordListSchema = z.array(scrapeJobRecordSchema);

export type ProductScrapeContext = z.infer<typeof productScrapeContextSchema>;
export type ScrapeJobRecord = z.infer<typeof scrapeJobRecordSchema>;
export type ScrapeResultRecord = z.infer<typeof scrapeResultRecordSchema>;
export type PriceHistoryAggregateRecord = z.infer<typeof priceHistoryAggregateSchema>;
export type ScheduleScrapeBody = z.infer<typeof scheduleScrapeBodySchema>;
export type ProductHistoryQuery = z.infer<typeof productHistoryQuerySchema>;
export type ProductHistoryPoint = z.infer<typeof productHistoryPointSchema>;
export type QueueDispatchResult = z.infer<typeof queueDispatchResultSchema>;
export type ScheduleScrapeResult = z.infer<typeof scheduleScrapeResultSchema>;
export type RecordScrapeObservationInput = z.infer<typeof recordScrapeObservationInputSchema>;
export type RecordScrapeObservationResult = z.infer<typeof recordScrapeObservationResultSchema>;