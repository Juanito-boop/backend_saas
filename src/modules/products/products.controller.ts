import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../../lib/auth-session';
import {
  createProductBodySchema,
  type CreateProductBody,
} from './domain/product.schemas';
import { ProductsService } from './products.service';

@Controller('api/teams/:teamId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
    @Body(new ZodValidationPipe(createProductBodySchema))
    body: CreateProductBody,
  ) {
    return this.productsService.createProduct(user.id, {
      teamId,
      domainId: body.domainId,
      name: body.name,
      url: body.url,
      selector: body.selector,
      xpathSelector: body.xpathSelector,
      regexPattern: body.regexPattern,
      jsonPath: body.jsonPath,
      scrapeStrategy: body.scrapeStrategy,
    });
  }

  @Get()
  async listProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', new ParseUUIDPipe()) teamId: string,
  ) {
    return this.productsService.listProducts(user.id, teamId);
  }
}
