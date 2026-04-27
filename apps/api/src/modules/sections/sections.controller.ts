import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsBoolean, IsArray, IsUUID, MinLength } from 'class-validator';
import { SectionsService } from './sections.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateSectionDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  emoji?: string;
}

class UpdateSectionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class ReorderSectionsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

class SetProductsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  productIds!: string[];
}

// Public
@Controller('menu/sections')
export class SectionsPublicController {
  constructor(private readonly service: SectionsService) {}

  @Get()
  listPublic() {
    return this.service.listPublic();
  }
}

// Admin
@UseGuards(JwtAuthGuard)
@Controller('admin/sections')
export class SectionsAdminController {
  constructor(private readonly service: SectionsService) {}

  @Get()
  listAll() {
    return this.service.listAll();
  }

  @Post()
  create(@Body() dto: CreateSectionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderSectionsDto) {
    return this.service.reorderSections(dto.ids);
  }

  @Put(':id/products')
  setProducts(@Param('id') id: string, @Body() dto: SetProductsDto) {
    return this.service.setProducts(id, dto.productIds);
  }
}
