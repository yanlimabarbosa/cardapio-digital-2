import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import {
  GetStoreStatusUseCase,
  GetStoreStatusResult,
} from './application/use-cases/get-store-status.use-case';
import { GetStoreSettingsUseCase } from './application/use-cases/get-store-settings.use-case';

type PublicMarketingSettingsResponse = {
  metaPixelEnabled: boolean;
  metaPixelIds: readonly string[];
};

@Controller('store')
export class StoreController {
  public constructor(
    private readonly getStoreStatusUseCase: GetStoreStatusUseCase,
    private readonly getStoreSettingsUseCase: GetStoreSettingsUseCase,
  ) {}

  @Get('status')
  public getStatus(@Query('scheduledFor') scheduledFor?: string): Promise<GetStoreStatusResult> {
    if (!scheduledFor) return this.getStoreStatusUseCase.execute();
    const date = new Date(scheduledFor);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Horário agendado inválido');
    }
    return this.getStoreStatusUseCase.execute({ at: date, ignoreForceOpen: true });
  }

  @Get('marketing-settings')
  public async getMarketingSettings(): Promise<PublicMarketingSettingsResponse> {
    const settings = await this.getStoreSettingsUseCase.execute();

    return {
      metaPixelEnabled: settings.metaPixelEnabled,
      metaPixelIds: settings.metaPixelIds,
    };
  }
}
