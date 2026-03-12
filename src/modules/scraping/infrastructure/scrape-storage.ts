import { and, eq, lte } from 'drizzle-orm';

import { parseSchema } from '../../../common/zod/parse';
import { db } from '../../../db/database';
import {
  priceHistory,
  priceHistoryDaily,
  priceHistoryHourly,
  products,
  scrapeJobs,
  scrapeResults,
} from '../../../db/schema';
import {
  priceHistoryAggregateSchema,
  recordScrapeObservationInputSchema,
  recordScrapeObservationResultSchema,
  scrapeResultRecordSchema,
  type RecordScrapeObservationInput,
  type RecordScrapeObservationResult,
} from '../domain/scraping.schemas';

const RAW_RETENTION_DAYS = 14;

function getBucketStart(date: Date, resolution: 'hour' | 'day') {
  const bucket = new Date(date);
  bucket.setUTCMinutes(0, 0, 0);

  if (resolution === 'day') {
    bucket.setUTCHours(0, 0, 0, 0);
  }

  return bucket;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function toPriceNumber(price: string | null | undefined) {
  if (!price) {
    return null;
  }

  const normalized = Number(price.replace(/,/g, '.'));
  return Number.isFinite(normalized) ? normalized : null;
}

function pickMinPrice(current: string | null, incoming: string | null) {
  if (!incoming) {
    return current;
  }

  if (!current) {
    return incoming;
  }

  const currentValue = toPriceNumber(current);
  const incomingValue = toPriceNumber(incoming);

  if (currentValue == null || incomingValue == null) {
    return current;
  }

  return incomingValue < currentValue ? incoming : current;
}

function pickMaxPrice(current: string | null, incoming: string | null) {
  if (!incoming) {
    return current;
  }

  if (!current) {
    return incoming;
  }

  const currentValue = toPriceNumber(current);
  const incomingValue = toPriceNumber(incoming);

  if (currentValue == null || incomingValue == null) {
    return current;
  }

  return incomingValue > currentValue ? incoming : current;
}

async function upsertAggregate(
  resolution: 'hour' | 'day',
  input: Pick<
    RecordScrapeObservationInput,
    'productId' | 'success' | 'checkedAt' | 'price' | 'currency'
  >,
) {
  const bucketStart = getBucketStart(input.checkedAt, resolution);
  const table = resolution === 'hour' ? priceHistoryHourly : priceHistoryDaily;

  const [existingAggregate] = await db
    .select()
    .from(table)
    .where(
      and(
        eq(table.productId, input.productId),
        eq(table.bucketStart, bucketStart),
      ),
    )
    .limit(1);

  if (!existingAggregate) {
    if (!input.price && !input.success) {
      const [createdAggregate] = await db
        .insert(table)
        .values({
          productId: input.productId,
          bucketStart,
          sampleCount: 1,
          successCount: 0,
          failureCount: 1,
          currency: input.currency,
        })
        .returning();

      return parseSchema(
        priceHistoryAggregateSchema,
        createdAggregate,
        `scrape-storage.upsertAggregate.${resolution}.create`,
      );
    }

    const [createdAggregate] = await db
      .insert(table)
      .values({
        productId: input.productId,
        bucketStart,
        sampleCount: 1,
        successCount: input.success ? 1 : 0,
        failureCount: input.success ? 0 : 1,
        firstPrice: input.price,
        minPrice: input.price,
        maxPrice: input.price,
        lastPrice: input.price,
        currency: input.currency,
      })
      .returning();

    return parseSchema(
      priceHistoryAggregateSchema,
      createdAggregate,
      `scrape-storage.upsertAggregate.${resolution}.create`,
    );
  }

  const [updatedAggregate] = await db
    .update(table)
    .set({
      sampleCount: existingAggregate.sampleCount + 1,
      successCount: existingAggregate.successCount + (input.success ? 1 : 0),
      failureCount: existingAggregate.failureCount + (input.success ? 0 : 1),
      firstPrice: existingAggregate.firstPrice ?? input.price,
      minPrice: pickMinPrice(existingAggregate.minPrice, input.price ?? null),
      maxPrice: pickMaxPrice(existingAggregate.maxPrice, input.price ?? null),
      lastPrice: input.price ?? existingAggregate.lastPrice,
      currency: input.currency ?? existingAggregate.currency,
      updatedAt: input.checkedAt,
    })
    .where(eq(table.id, existingAggregate.id))
    .returning();

  return parseSchema(
    priceHistoryAggregateSchema,
    updatedAggregate,
    `scrape-storage.upsertAggregate.${resolution}.update`,
  );
}

export async function markScrapeJobStarted(
  scrapeJobId: string,
  workerId: string,
) {
  await db
    .update(scrapeJobs)
    .set({
      status: 'running',
      workerId,
      startedAt: new Date(),
    })
    .where(eq(scrapeJobs.id, scrapeJobId));
}

export async function markScrapeJobCompleted(
  scrapeJobId: string,
  workerId: string,
) {
  await db
    .update(scrapeJobs)
    .set({
      status: 'completed',
      workerId,
      finishedAt: new Date(),
    })
    .where(eq(scrapeJobs.id, scrapeJobId));
}

export async function markScrapeJobFailed(
  scrapeJobId: string,
  workerId: string,
) {
  await db
    .update(scrapeJobs)
    .set({
      status: 'failed',
      workerId,
      finishedAt: new Date(),
    })
    .where(eq(scrapeJobs.id, scrapeJobId));
}

export async function recordScrapeObservation(
  input: RecordScrapeObservationInput,
): Promise<RecordScrapeObservationResult> {
  const parsedInput = parseSchema(
    recordScrapeObservationInputSchema,
    input,
    'scrape-storage.recordScrapeObservation.input',
  );
  const [product] = await db
    .select({
      id: products.id,
      lastPrice: products.lastPrice,
      lastCheckedAt: products.lastCheckedAt,
      lastPriceChangedAt: products.lastPriceChangedAt,
      lastScrapeError: products.lastScrapeError,
      htmlHash: products.htmlHash,
      currency: products.currency,
      status: products.status,
    })
    .from(products)
    .where(eq(products.id, parsedInput.productId))
    .limit(1);

  const priceChanged = Boolean(
    parsedInput.success &&
    parsedInput.price &&
    product?.lastPrice !== parsedInput.price,
  );

  await db
    .update(scrapeJobs)
    .set({
      status: parsedInput.success ? 'completed' : 'failed',
      workerId: parsedInput.workerId,
      finishedAt: parsedInput.checkedAt,
      startedAt: product?.lastCheckedAt ? undefined : parsedInput.checkedAt,
    })
    .where(eq(scrapeJobs.id, parsedInput.scrapeJobId));

  const [rawResult] = await db
    .insert(scrapeResults)
    .values({
      jobId: parsedInput.scrapeJobId,
      productId: parsedInput.productId,
      success: parsedInput.success,
      price: parsedInput.price,
      currency: parsedInput.currency,
      error: parsedInput.error,
      responseTimeMs: parsedInput.responseTimeMs,
      retentionUntil: addDays(parsedInput.checkedAt, RAW_RETENTION_DAYS),
      checkedAt: parsedInput.checkedAt,
    })
    .returning();

  const parsedRawResult = parseSchema(
    scrapeResultRecordSchema,
    rawResult,
    'scrape-storage.recordScrapeObservation.rawResult',
  );

  await db
    .update(products)
    .set({
      lastPrice: parsedInput.success
        ? (parsedInput.price ?? product?.lastPrice ?? null)
        : (product?.lastPrice ?? null),
      lastCheckedAt: parsedInput.checkedAt,
      lastPriceChangedAt: priceChanged
        ? parsedInput.checkedAt
        : (product?.lastPriceChangedAt ?? null),
      lastScrapeError: parsedInput.success
        ? null
        : (parsedInput.error ?? 'Unknown scrape error'),
      currency: parsedInput.currency ?? product?.currency ?? null,
      htmlHash: parsedInput.htmlHash ?? product?.htmlHash ?? null,
      status: parsedInput.success ? 'active' : 'error',
    })
    .where(eq(products.id, parsedInput.productId));

  if (priceChanged && parsedInput.price) {
    await db.insert(priceHistory).values({
      productId: parsedInput.productId,
      price: parsedInput.price,
      currency: parsedInput.currency,
      checkedAt: parsedInput.checkedAt,
    });
  }

  await upsertAggregate('hour', parsedInput);
  await upsertAggregate('day', parsedInput);

  return parseSchema(
    recordScrapeObservationResultSchema,
    {
      rawResult: parsedRawResult,
      priceChanged,
    },
    'scrape-storage.recordScrapeObservation.result',
  );
}

export async function pruneExpiredRawScrapeResults(cutoff: Date) {
  await db
    .delete(scrapeResults)
    .where(lte(scrapeResults.retentionUntil, cutoff));
}
