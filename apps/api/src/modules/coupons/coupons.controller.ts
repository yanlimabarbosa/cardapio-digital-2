import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Post('validate')
  async validate(@Body() dto: ValidateCouponDto) {
    const result = await this.service.validateAndCalculate(
      dto.code,
      dto.items,
      dto.deliveryType,
      dto.customerPhone,
    );

    if (!result.valid) {
      return { valid: false, reason: result.reason };
    }

    return {
      valid: true,
      discount: result.calculatedDiscount,
      eligibleAmount: result.eligibleAmount,
      coupon: {
        code: result.coupon.code,
        discountType: result.coupon.discountType,
        discountValue: parseFloat(result.coupon.discountValue),
      },
    };
  }
}

@UseGuards(JwtAuthGuard)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  listAll() {
    return this.service.listAll();
  }

  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  toggleActive(@Param('id') id: string) {
    return this.service.toggleActive(id);
  }
}
