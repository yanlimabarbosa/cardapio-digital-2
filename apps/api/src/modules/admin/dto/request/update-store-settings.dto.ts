import { IsArray, IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { WeeklySchedule } from '@cardapio/shared';

export class UpdateStoreSettingsDto {
  @IsOptional()
  @IsString()
  public readonly openingTime?: string;

  @IsOptional()
  @IsString()
  public readonly closingTime?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  public readonly openDays?: number[];

  @IsOptional()
  @IsObject()
  public readonly weeklySchedule?: WeeklySchedule | null;

  @IsOptional()
  @IsBoolean()
  public readonly forceClose?: boolean;

  @IsOptional()
  @IsBoolean()
  public readonly forceOpen?: boolean;

  @IsOptional()
  @IsNumber()
  public readonly pointsPerReal?: number;

  @IsOptional()
  @IsString()
  public readonly receiptCnpj?: string;

  @IsOptional()
  @IsString()
  public readonly receiptAddress?: string;

  @IsOptional()
  @IsString()
  public readonly receiptPhone?: string;

  @IsOptional()
  @IsString()
  public readonly receiptFooter?: string;

  @IsOptional()
  @IsString()
  public readonly bannerUrl?: string;
}
