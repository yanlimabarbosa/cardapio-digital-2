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
import {
  AdminCouponDuplicateCodeError,
  AdminCouponNotFoundError,
} from './application/errors/admin-coupon.errors';
import { CreateAdminCouponUseCase } from './application/use-cases/create-admin-coupon.use-case';
import { ListAdminCouponsUseCase } from './application/use-cases/list-admin-coupons.use-case';
import { ToggleAdminCouponActiveUseCase } from './application/use-cases/toggle-admin-coupon-active.use-case';
import { UpdateAdminCouponUseCase } from './application/use-cases/update-admin-coupon.use-case';
import { ValidateCouponUseCase } from './application/use-cases/validate-coupon.use-case';
import {
  toAdminCouponResponseDto,
  toAdminCouponResponseDtos,
  toValidateCouponResponseDto,
} from './coupon.mapper';
import { AdminCouponResponseDto } from './dto/response/admin-coupon-response.dto';
import { CreateCouponDto } from './dto/request/create-coupon.dto';
import { UpdateCouponDto } from './dto/request/update-coupon.dto';
import { ValidateCouponDto } from './dto/request/validate-coupon.dto';
import { ValidateCouponResponseDto } from './dto/response/validate-coupon-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('coupons')
export class CouponsController {
  public constructor(private readonly validateCouponUseCase: ValidateCouponUseCase) {}

  @Post('validate')
  public async validate(@Body() dto: ValidateCouponDto): Promise<ValidateCouponResponseDto> {
    const result = await this.validateCouponUseCase.execute({
      code: dto.code,
      items: dto.items,
      deliveryType: dto.deliveryType,
      customerPhone: dto.customerPhone,
    });

    return toValidateCouponResponseDto(result);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('admin/coupons')
export class AdminCouponsController {
  public constructor(
    private readonly createAdminCouponUseCase: CreateAdminCouponUseCase,
    private readonly listAdminCouponsUseCase: ListAdminCouponsUseCase,
    private readonly toggleAdminCouponActiveUseCase: ToggleAdminCouponActiveUseCase,
    private readonly updateAdminCouponUseCase: UpdateAdminCouponUseCase,
  ) {}

  @Get()
  public async listAll(): Promise<AdminCouponResponseDto[]> {
    const coupons = await this.listAdminCouponsUseCase.execute();

    return toAdminCouponResponseDtos(coupons);
  }

  @Post()
  public async create(@Body() dto: CreateCouponDto): Promise<AdminCouponResponseDto> {
    try {
      const coupon = await this.createAdminCouponUseCase.execute({
        code: dto.code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscount: dto.maxDiscount,
        minOrderAmount: dto.minOrderAmount,
        minQuantity: dto.minQuantity,
        validFrom: dto.validFrom,
        validUntil: dto.validUntil,
        validDays: dto.validDays,
        validTimeFrom: dto.validTimeFrom,
        validTimeTo: dto.validTimeTo,
        maxUses: dto.maxUses,
        maxUsesPerCustomer: dto.maxUsesPerCustomer,
        firstOrderOnly: dto.firstOrderOnly,
        excludePromotional: dto.excludePromotional,
        deliveryTypeRestriction: dto.deliveryTypeRestriction,
        applicableProductIds: dto.applicableProductIds,
        applicableCategoryIds: dto.applicableCategoryIds,
        applicableSectionIds: dto.applicableSectionIds,
        isActive: dto.isActive,
      });

      return toAdminCouponResponseDto(coupon);
    } catch (error: unknown) {
      if (error instanceof AdminCouponDuplicateCodeError) {
        throw new BadRequestException('Já existe um cupom com este código');
      }

      throw error;
    }
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ): Promise<AdminCouponResponseDto> {
    try {
      const coupon = await this.updateAdminCouponUseCase.execute(id, {
        code: dto.code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscount: dto.maxDiscount,
        minOrderAmount: dto.minOrderAmount,
        minQuantity: dto.minQuantity,
        validFrom: dto.validFrom,
        validUntil: dto.validUntil,
        validDays: dto.validDays,
        validTimeFrom: dto.validTimeFrom,
        validTimeTo: dto.validTimeTo,
        maxUses: dto.maxUses,
        maxUsesPerCustomer: dto.maxUsesPerCustomer,
        firstOrderOnly: dto.firstOrderOnly,
        excludePromotional: dto.excludePromotional,
        deliveryTypeRestriction: dto.deliveryTypeRestriction,
        applicableProductIds: dto.applicableProductIds,
        applicableCategoryIds: dto.applicableCategoryIds,
        applicableSectionIds: dto.applicableSectionIds,
        isActive: dto.isActive,
      });

      return toAdminCouponResponseDto(coupon);
    } catch (error: unknown) {
      if (error instanceof AdminCouponNotFoundError) {
        throw new NotFoundException('Cupom não encontrado');
      }

      if (error instanceof AdminCouponDuplicateCodeError) {
        throw new BadRequestException('Já existe um cupom com este código');
      }

      throw error;
    }
  }

  @Delete(':id')
  public async toggleActive(@Param('id') id: string): Promise<AdminCouponResponseDto> {
    try {
      const coupon = await this.toggleAdminCouponActiveUseCase.execute(id);

      return toAdminCouponResponseDto(coupon);
    } catch (error: unknown) {
      if (error instanceof AdminCouponNotFoundError) {
        throw new NotFoundException('Cupom não encontrado');
      }

      throw error;
    }
  }
}
