import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('menu')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getMenu(@Query('scheduledFor') scheduledFor?: string) {
    return this.productsService.getMenu(scheduledFor);
  }

  @Get('featured')
  getFeatured(@Query('scheduledFor') scheduledFor?: string) {
    return this.productsService.getFeatured(scheduledFor);
  }

  @Get('products')
  getProductsByIds(@Query('ids') ids: string, @Query('scheduledFor') scheduledFor?: string) {
    const productIds = ids?.split(',').filter(Boolean).slice(0, 50) || [];
    if (productIds.length === 0) return [];
    return this.productsService.getProductsByIds(productIds, scheduledFor);
  }
}
