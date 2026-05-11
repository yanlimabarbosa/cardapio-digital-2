import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import {
  DeliveryAreaAlreadyExistsError,
  DeliveryAreaNotFoundError,
} from './application/errors/delivery-area.errors';
import { CreateDeliveryAreaUseCase } from './application/use-cases/create-delivery-area.use-case';
import { DeleteDeliveryAreaUseCase } from './application/use-cases/delete-delivery-area.use-case';
import { ListActiveDeliveryAreasUseCase } from './application/use-cases/list-active-delivery-areas.use-case';
import { ListAdminDeliveryAreasUseCase } from './application/use-cases/list-admin-delivery-areas.use-case';
import { UpdateDeliveryAreaUseCase } from './application/use-cases/update-delivery-area.use-case';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { toDeliveryAreaResponseDto } from './delivery-area.mapper';
import { DeliveryAreaResponseDto } from './dto/response/delivery-area-response.dto';

class CreateDeliveryAreaDto {
  /** Delivery neighborhood name. */
  @IsString()
  @MinLength(1)
  declare public readonly neighborhood: string;

  /** Delivery city name. */
  @IsString()
  @MinLength(1)
  declare public readonly city: string;

  /** Delivery fee charged for this area. */
  @IsNumber()
  @Min(0)
  declare public readonly fee: number;
}

class UpdateDeliveryAreaDto {
  /** Delivery neighborhood name. */
  @IsOptional()
  @IsString()
  declare public readonly neighborhood?: string;

  /** Delivery city name. */
  @IsOptional()
  @IsString()
  declare public readonly city?: string;

  /** Delivery fee charged for this area. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare public readonly fee?: number;

  /** Whether this delivery area can be selected by customers. */
  @IsOptional()
  @IsBoolean()
  declare public readonly isActive?: boolean;
}

@Controller('delivery-areas')
export class DeliveryAreasController {
  public constructor(private readonly listActiveDeliveryAreasUseCase: ListActiveDeliveryAreasUseCase) {}

  @Get()
  public async listActive(): Promise<DeliveryAreaResponseDto[]> {
    const areas = await this.listActiveDeliveryAreasUseCase.execute();

    return areas.map(toDeliveryAreaResponseDto);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('admin/delivery-areas')
export class AdminDeliveryAreasController {
  public constructor(
    private readonly createDeliveryAreaUseCase: CreateDeliveryAreaUseCase,
    private readonly deleteDeliveryAreaUseCase: DeleteDeliveryAreaUseCase,
    private readonly listAdminDeliveryAreasUseCase: ListAdminDeliveryAreasUseCase,
    private readonly updateDeliveryAreaUseCase: UpdateDeliveryAreaUseCase,
  ) {}

  @Get()
  public async listAll(): Promise<DeliveryAreaResponseDto[]> {
    const areas = await this.listAdminDeliveryAreasUseCase.execute();

    return areas.map(toDeliveryAreaResponseDto);
  }

  @Post()
  public async create(@Body() dto: CreateDeliveryAreaDto): Promise<DeliveryAreaResponseDto> {
    try {
      const area = await this.createDeliveryAreaUseCase.execute({
        neighborhood: dto.neighborhood,
        city: dto.city,
        fee: dto.fee,
      });

      return toDeliveryAreaResponseDto(area);
    } catch (error: unknown) {
      if (error instanceof DeliveryAreaAlreadyExistsError) {
        throw new BadRequestException('Essa área de entrega já existe');
      }

      throw error;
    }
  }

  @Put(':id')
  public update(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryAreaDto,
  ): Promise<DeliveryAreaResponseDto> {
    return this.updateDeliveryArea(id, dto);
  }

  @Delete(':id')
  public async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.deleteDeliveryAreaUseCase.execute(id);
    } catch (error: unknown) {
      if (error instanceof DeliveryAreaNotFoundError) {
        throw new NotFoundException('Área de entrega não encontrada');
      }

      throw error;
    }
  }

  private async updateDeliveryArea(
    id: string,
    dto: UpdateDeliveryAreaDto,
  ): Promise<DeliveryAreaResponseDto> {
    try {
      const area = await this.updateDeliveryAreaUseCase.execute({
        id,
        neighborhood: dto.neighborhood,
        city: dto.city,
        fee: dto.fee,
        isActive: dto.isActive,
      });

      return toDeliveryAreaResponseDto(area);
    } catch (error: unknown) {
      if (error instanceof DeliveryAreaNotFoundError) {
        throw new NotFoundException('Área de entrega não encontrada');
      }

      if (error instanceof DeliveryAreaAlreadyExistsError) {
        throw new BadRequestException('Essa área de entrega já existe');
      }

      throw error;
    }
  }
}
