import { z } from 'zod';

export const productRecordSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  domainId: z.string().uuid(),
  createdBy: z.string().uuid(),
  name: z.string().nullable(),
  url: z.string().url(),
  selector: z.string(),
  xpathSelector: z.string().nullable(),
  regexPattern: z.string().nullable(),
  jsonPath: z.string().nullable(),
  scrapeStrategy: z.string(),
  htmlHash: z.string().nullable(),
  lastPrice: z.string().nullable(),
  lastCheckedAt: z.date().nullable(),
  lastPriceChangedAt: z.date().nullable(),
  lastScrapeError: z.string().nullable(),
  currency: z.string().nullable(),
  status: z.string(),
  createdAt: z.date(),
});

export const createProductBodySchema = z.object({
  domainId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  url: z.string().url(),
  selector: z.string().trim().min(1).max(200),
  xpathSelector: z.string().trim().min(1).max(300).optional(),
  regexPattern: z.string().trim().min(1).max(200).optional(),
  jsonPath: z.string().trim().min(1).max(200).optional(),
  scrapeStrategy: z.string().trim().min(1).max(30).optional(),
});

export const productRecordListSchema = z.array(productRecordSchema);

export type ProductRecord = z.infer<typeof productRecordSchema>;
export type CreateProductBody = z.infer<typeof createProductBodySchema>;