import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import {
  GetStoreStatusUseCase,
  GetStoreStatusResult,
} from './application/use-cases/get-store-status.use-case';

@Controller('store')
export class StoreController {
  public constructor(private readonly getStoreStatusUseCase: GetStoreStatusUseCase) {}

  @Get('status')
  public getStatus(@Query('scheduledFor') scheduledFor?: string): Promise<GetStoreStatusResult> {
    if (!scheduledFor) return this.getStoreStatusUseCase.execute();
    const date = new Date(scheduledFor);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Horário agendado inválido');
    }
    return this.getStoreStatusUseCase.execute({ at: date, ignoreForceOpen: true });
  }
}
