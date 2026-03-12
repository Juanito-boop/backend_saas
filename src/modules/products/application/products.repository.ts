import type { ProductRecord } from '../domain/product.types';

export const PRODUCTS_REPOSITORY = Symbol('PRODUCTS_REPOSITORY');

export type CreateProductRecordInput = {
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
};

export interface ProductsRepository {
  createProduct(input: CreateProductRecordInput): Promise<ProductRecord>;
  listProductsByTeam(teamId: string): Promise<ProductRecord[]>;
  findProductById(productId: string): Promise<ProductRecord | null>;
}