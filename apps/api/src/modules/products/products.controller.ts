import { Controller, Get, Query } from '@nestjs/common';
import {
  GetPublicMenuResult,
  GetPublicMenuUseCase,
} from '../menu/application/use-cases/get-public-menu.use-case';
import {
  GetFeaturedProductsResult,
  GetFeaturedProductsUseCase,
} from '../menu/application/use-cases/get-featured-products.use-case';
import {
  GetProductsByIdsResult,
  GetProductsByIdsUseCase,
} from '../menu/application/use-cases/get-products-by-ids.use-case';

@Controller('menu')
export class ProductsController {
  public constructor(
    private readonly getPublicMenuUseCase: GetPublicMenuUseCase,
    private readonly getFeaturedProductsUseCase: GetFeaturedProductsUseCase,
    private readonly getProductsByIdsUseCase: GetProductsByIdsUseCase,
  ) {}

  @Get()
  public getMenu(@Query('scheduledFor') scheduledFor?: string): Promise<GetPublicMenuResult> {
    return this.getPublicMenuUseCase.execute({ scheduledFor });
  }

  @Get('featured')
  public getFeatured(@Query('scheduledFor') scheduledFor?: string): Promise<GetFeaturedProductsResult> {
    return this.getFeaturedProductsUseCase.execute({ scheduledFor });
  }

  @Get('products')
  public async getProductsByIds(
    @Query('ids') ids: string,
    @Query('scheduledFor') scheduledFor?: string,
  ): Promise<GetProductsByIdsResult> {
    const productIds = ids?.split(',').filter(Boolean).slice(0, 50) || [];
    if (productIds.length === 0) return [];
    return this.getProductsByIdsUseCase.execute({ ids: productIds, scheduledFor });
  }
}
