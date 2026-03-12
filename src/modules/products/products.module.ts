import { Module } from '@nestjs/common';

import { TeamsModule } from '../teams/teams.module';
import { PRODUCTS_REPOSITORY } from './application/products.repository';
import { ProductsController } from './products.controller';
import { DrizzleProductsRepository } from './infrastructure/drizzle-products.repository';
import { ProductsService } from './products.service';

@Module({
  imports: [TeamsModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    DrizzleProductsRepository,
    {
      provide: PRODUCTS_REPOSITORY,
      useExisting: DrizzleProductsRepository,
    },
  ],
  exports: [ProductsService],
})
export class ProductsModule { }