import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { StoreService } from './store.service';

@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('status')
  getStatus(@Query('scheduledFor') scheduledFor?: string) {
    if (!scheduledFor) return this.storeService.isOpen();
    const date = new Date(scheduledFor);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Horário agendado inválido');
    }
    return this.storeService.isOpen(date, { ignoreForceOpen: true });
  }
}
