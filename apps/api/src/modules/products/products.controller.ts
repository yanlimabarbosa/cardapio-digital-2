import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('menu')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getMenu() {
    return this.productsService.getMenu();
  }

  @Get('featured')
  getFeatured() {
    return this.productsService.getFeatured();
  }

  @Get('products')
  getProductsByIds(@Query('ids') ids: string) {
    const productIds = ids?.split(',').filter(Boolean).slice(0, 50) || [];
    if (productIds.length === 0) return [];
    return this.productsService.getProductsByIds(productIds);
  }
}
