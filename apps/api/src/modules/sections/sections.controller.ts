import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsBoolean, IsArray, IsUUID, MinLength, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WeeklySchedule } from '@cardapio/shared';
import {
  AdminSectionNotFoundError,
  AdminSectionProductNotFoundError,
} from '../admin/application/errors/admin-section.errors';
import { CreateAdminSectionUseCase } from '../admin/application/use-cases/create-admin-section.use-case';
import { DeleteAdminSectionUseCase } from '../admin/application/use-cases/delete-admin-section.use-case';
import { ListAdminSectionsUseCase } from '../admin/application/use-cases/list-admin-sections.use-case';
import { ReorderAdminSectionsUseCase } from '../admin/application/use-cases/reorder-admin-sections.use-case';
import { SetAdminSectionProductsUseCase } from '../admin/application/use-cases/set-admin-section-products.use-case';
import { UpdateAdminSectionUseCase } from '../admin/application/use-cases/update-admin-section.use-case';
import {
  GetPublicSectionsResult,
  GetPublicSectionsUseCase,
} from '../menu/application/use-cases/get-public-sections.use-case';
import { AdminSectionMutationResponseDto, AdminSectionResponseDto } from './dto/response/admin-section-response.dto';
import { DeleteSectionResponseDto } from './dto/response/delete-section-response.dto';
import { toAdminSectionMutationResponseDto, toAdminSectionResponseDto } from './section.mapper';

class CreateSectionDto {
  @IsString()
  @MinLength(1)
  declare public readonly label: string;

  @IsOptional()
  @IsString()
  declare public readonly emoji?: string;

  @IsOptional()
  @IsObject()
  declare public readonly availabilitySchedule?: WeeklySchedule | null;
}

class UpdateSectionDto {
  @IsOptional()
  @IsString()
  declare public readonly label?: string;

  @IsOptional()
  @IsString()
  declare public readonly emoji?: string;

  @IsOptional()
  @IsBoolean()
  declare public readonly isActive?: boolean;

  @IsOptional()
  @IsObject()
  declare public readonly availabilitySchedule?: WeeklySchedule | null;
}

class ReorderSectionsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  declare public readonly ids: string[];
}

class SetProductsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  declare public readonly productIds: string[];
}

// Public
@Controller('menu/sections')
export class SectionsPublicController {
  public constructor(private readonly getPublicSectionsUseCase: GetPublicSectionsUseCase) {}

  @Get()
  public listPublic(@Query('scheduledFor') scheduledFor?: string): Promise<GetPublicSectionsResult> {
    return this.getPublicSectionsUseCase.execute({ scheduledFor });
  }
}

// Admin
@UseGuards(JwtAuthGuard)
@Controller('admin/sections')
export class SectionsAdminController {
  public constructor(
    private readonly createAdminSectionUseCase: CreateAdminSectionUseCase,
    private readonly deleteAdminSectionUseCase: DeleteAdminSectionUseCase,
    private readonly listAdminSectionsUseCase: ListAdminSectionsUseCase,
    private readonly reorderAdminSectionsUseCase: ReorderAdminSectionsUseCase,
    private readonly setAdminSectionProductsUseCase: SetAdminSectionProductsUseCase,
    private readonly updateAdminSectionUseCase: UpdateAdminSectionUseCase,
  ) {}

  @Get()
  public async listAll(): Promise<AdminSectionResponseDto[]> {
    const sections = await this.listAdminSectionsUseCase.execute();
    return sections.map(toAdminSectionResponseDto);
  }

  @Post()
  public async create(@Body() dto: CreateSectionDto): Promise<AdminSectionResponseDto> {
    const section = await this.createAdminSectionUseCase.execute({
      label: dto.label,
      emoji: dto.emoji,
      availabilitySchedule: dto.availabilitySchedule,
    });

    return toAdminSectionResponseDto(section);
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<AdminSectionMutationResponseDto> {
    try {
      const section = await this.updateAdminSectionUseCase.execute({
        id,
        label: dto.label,
        emoji: dto.emoji,
        isActive: dto.isActive,
        availabilitySchedule: dto.availabilitySchedule,
      });

      return toAdminSectionMutationResponseDto(section);
    } catch (error) {
      if (error instanceof AdminSectionNotFoundError) {
        throw new NotFoundException('Seção não encontrada');
      }

      throw error;
    }
  }

  @Delete(':id')
  public async remove(@Param('id') id: string): Promise<DeleteSectionResponseDto> {
    try {
      const result = await this.deleteAdminSectionUseCase.execute({ id });

      return new DeleteSectionResponseDto(result.success);
    } catch (error) {
      if (error instanceof AdminSectionNotFoundError) {
        throw new NotFoundException('Seção não encontrada');
      }

      throw error;
    }
  }

  @Patch('reorder')
  public async reorder(@Body() dto: ReorderSectionsDto): Promise<void> {
    await this.reorderAdminSectionsUseCase.execute({ ids: dto.ids });
  }

  @Put(':id/products')
  public async setProducts(@Param('id') id: string, @Body() dto: SetProductsDto): Promise<void> {
    try {
      await this.setAdminSectionProductsUseCase.execute({
        sectionId: id,
        productIds: dto.productIds,
      });
    } catch (error) {
      if (error instanceof AdminSectionNotFoundError) {
        throw new NotFoundException('Seção não encontrada');
      }

      if (error instanceof AdminSectionProductNotFoundError) {
        throw new BadRequestException(`Produto ${error.productId} não encontrado`);
      }

      throw error;
    }
  }
}
