import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean, Min, MinLength } from 'class-validator';
import { DeliveryAreasService } from './delivery-areas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateDeliveryAreaDto {
  @IsString()
  @MinLength(1)
  neighborhood!: string;

  @IsString()
  @MinLength(1)
  city!: string;

  @IsNumber()
  @Min(0)
  fee!: number;
}

class UpdateDeliveryAreaDto {
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('delivery-areas')
export class DeliveryAreasController {
  constructor(private readonly service: DeliveryAreasService) {}

  // Public — returns active delivery areas with normalizedKeys for client-side matching
  @Get()
  listActive() {
    return this.service.listActive();
  }
}

@UseGuards(JwtAuthGuard)
@Controller('admin/delivery-areas')
export class AdminDeliveryAreasController {
  constructor(private readonly service: DeliveryAreasService) {}

  @Get()
  listAll() {
    return this.service.listAll();
  }

  @Post()
  create(@Body() dto: CreateDeliveryAreaDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryAreaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
