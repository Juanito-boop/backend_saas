import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { parseOptionalSchema, parseSchema } from '../../../common/zod/parse';
import { DatabaseService } from '../../../db/database.service';
import { products } from '../../../db/schema';
import type { ProductsRepository } from '../application/products.repository';
import type { ProductRecord } from '../domain/product.types';
import {
  productRecordListSchema,
  productRecordSchema,
} from '../domain/product.schemas';

@Injectable()
export class DrizzleProductsRepository implements ProductsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async createProduct(input: {
    teamId: string;
    domainId: string;
    createdBy: string;
    name?: string;
    url: string;
    selector: string;
    xpathSelector?: string;
    regexPattern?: string;
    jsonPath?: string;
    scrapeStrategy?: string;
  }): Promise<ProductRecord> {
    const [product] = await this.databaseService.db
      .insert(products)
      .values({
        teamId: input.teamId,
        domainId: input.domainId,
        createdBy: input.createdBy,
        name: input.name,
        url: input.url,
        selector: input.selector,
        xpathSelector: input.xpathSelector,
        regexPattern: input.regexPattern,
        jsonPath: input.jsonPath,
        scrapeStrategy: input.scrapeStrategy,
      })
      .returning();

    return parseSchema(
      productRecordSchema,
      product,
      'DrizzleProductsRepository.createProduct',
    );
  }

  async listProductsByTeam(teamId: string): Promise<ProductRecord[]> {
    const teamProducts = await this.databaseService.db
      .select()
      .from(products)
      .where(eq(products.teamId, teamId));

    return parseSchema(
      productRecordListSchema,
      teamProducts,
      'DrizzleProductsRepository.listProductsByTeam',
    );
  }

  async findProductById(productId: string): Promise<ProductRecord | null> {
    const [product] = await this.databaseService.db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    return parseOptionalSchema(
      productRecordSchema,
      product,
      'DrizzleProductsRepository.findProductById',
    );
  }
}
