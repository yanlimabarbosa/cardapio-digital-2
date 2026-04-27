import { Controller, Get } from '@nestjs/common';
import { StoreService } from './store.service';

@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('status')
  getStatus() {
    return this.storeService.isOpen();
  }
}
