import { Inject, Injectable } from '@nestjs/common';

import { parseSchema } from '../../../common/zod/parse';
import { NotFoundError } from '../../../common/errors/application-error';
import { TEAM_MEMBERSHIP_READER, type TeamMembershipReader } from '../../teams/application/team-membership-reader';
import {
  PRODUCTS_REPOSITORY,
  type ProductsRepository,
} from './products.repository';
import type { CreateProductBody, ProductRecord } from '../domain/product.schemas';
import { productRecordListSchema, productRecordSchema } from '../domain/product.schemas';

export type CreateProductInput = {
  teamId: string;
} & CreateProductBody;

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCTS_REPOSITORY)
    private readonly productsRepository: ProductsRepository,
    @Inject(TEAM_MEMBERSHIP_READER)
    private readonly teamMembershipReader: TeamMembershipReader,
  ) { }

  async createProduct(actorUserId: string, input: CreateProductInput): Promise<ProductRecord> {
    await this.teamMembershipReader.getMembershipOrThrow(input.teamId, actorUserId);

    const product = await this.productsRepository.createProduct({
      teamId: input.teamId,
      domainId: input.domainId,
      createdBy: actorUserId,
      name: input.name,
      url: input.url,
      selector: input.selector,
      xpathSelector: input.xpathSelector,
      regexPattern: input.regexPattern,
      jsonPath: input.jsonPath,
      scrapeStrategy: input.scrapeStrategy,
    });

    return parseSchema(productRecordSchema, product, 'ProductsService.createProduct');
  }

  async listProducts(actorUserId: string, teamId: string): Promise<ProductRecord[]> {
    await this.teamMembershipReader.getMembershipOrThrow(teamId, actorUserId);
    const products = await this.productsRepository.listProductsByTeam(teamId);
    return parseSchema(productRecordListSchema, products, 'ProductsService.listProducts');
  }

  async getProductOrThrow(actorUserId: string, productId: string): Promise<ProductRecord> {
    const product = await this.productsRepository.findProductById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await this.teamMembershipReader.getMembershipOrThrow(product.teamId, actorUserId);

    return parseSchema(productRecordSchema, product, 'ProductsService.getProductOrThrow');
  }
}