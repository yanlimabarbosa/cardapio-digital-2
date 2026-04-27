import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Coupon, CouponUsage, Customer, Product, Order } from '../../entities';
import { isPromotionActive } from '../../utils/product-price';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

interface ValidateItem {
  productId: string;
  quantity: number;
  extraIds?: string[];
}

interface ValidationSuccess {
  valid: true;
  coupon: Coupon;
  calculatedDiscount: number;
  eligibleAmount: number;
}

interface ValidationFailure {
  valid: false;
  reason: string;
}

type ValidationResult = ValidationSuccess | ValidationFailure;

@Injectable()
export class CouponsService {
  constructor(private readonly em: EntityManager) {}

  // ─── Public Validation ────────────────────────────────────────────

  async validateAndCalculate(
    code: string,
    items: ValidateItem[],
    deliveryType: string,
    customerPhone: string,
  ): Promise<ValidationResult> {
    const em = this.em.fork();
    const upperCode = code.toUpperCase();

    // 1. Find coupon
    const coupon = await em.findOne(Coupon, { code: upperCode });
    if (!coupon || !coupon.isActive) {
      return { valid: false, reason: 'Cupom não encontrado ou inativo' };
    }

    const now = new Date();

    // 2. Validate date range
    if (coupon.validFrom && now < coupon.validFrom) {
      return { valid: false, reason: 'Cupom ainda não está válido' };
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return { valid: false, reason: 'Cupom expirado' };
    }

    // 3. Validate day of week (0=Sunday, 6=Saturday)
    if (coupon.validDays && coupon.validDays.length > 0) {
      const currentDay = now.getDay();
      if (!coupon.validDays.includes(currentDay)) {
        return { valid: false, reason: 'Cupom não válido para este dia da semana' };
      }
    }

    // 4. Validate time range
    if (coupon.validTimeFrom || coupon.validTimeTo) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (coupon.validTimeFrom && currentTime < coupon.validTimeFrom) {
        return { valid: false, reason: 'Cupom não válido neste horário' };
      }
      if (coupon.validTimeTo && currentTime > coupon.validTimeTo) {
        return { valid: false, reason: 'Cupom não válido neste horário' };
      }
    }

    // 5. Validate delivery type
    if (coupon.deliveryTypeRestriction && coupon.deliveryTypeRestriction !== deliveryType) {
      const label = coupon.deliveryTypeRestriction === 'delivery' ? 'entrega' : 'retirada';
      return { valid: false, reason: `Cupom válido apenas para ${label}` };
    }

    // 6. Check max uses
    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
      return { valid: false, reason: 'Cupom atingiu o limite de usos' };
    }

    // 7. Check per-customer usage
    if (coupon.maxUsesPerCustomer > 0) {
      const customer = await em.findOne(Customer, { phone: customerPhone });
      if (customer) {
        const usageCount = await em.count(CouponUsage, { coupon, customer });
        if (usageCount >= coupon.maxUsesPerCustomer) {
          return { valid: false, reason: 'Você já atingiu o limite de uso deste cupom' };
        }
      }
    }

    // 8. Check first order only
    if (coupon.firstOrderOnly) {
      const customer = await em.findOne(Customer, { phone: customerPhone });
      if (customer) {
        const orderCount = await em.count(Order, { customer });
        if (orderCount > 0) {
          return { valid: false, reason: 'Cupom válido apenas para o primeiro pedido' };
        }
      }
    }

    // 9. Fetch products and calculate eligible amount
    const productIds = items.map((i) => i.productId);
    const products = await em.find(Product, { id: { $in: productIds } }, { populate: ['extras', 'category', 'optionGroups', 'optionGroups.options'] });

    let eligibleAmountCents = 0;
    let eligibleQuantity = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      // Check product-level restriction
      if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
        if (!coupon.applicableProductIds.includes(product.id)) continue;
      }

      // Check category-level restriction
      if (coupon.applicableCategoryIds && coupon.applicableCategoryIds.length > 0) {
        if (!coupon.applicableCategoryIds.includes(product.category.id)) continue;
      }

      // Exclude promotional items if configured
      if (coupon.excludePromotional && isPromotionActive(product)) continue;

      // Calculate item price (base price, no extras — extras are separate)
      const unitPriceCents = Math.round(parseFloat(product.price) * 100);
      let itemExtras = 0;
      if (item.extraIds?.length) {
        for (const extraId of item.extraIds) {
          const extra = product.extras.getItems().find((e) => e.id === extraId);
          if (extra) {
            itemExtras += Math.round(parseFloat(extra.price) * 100);
          }
        }
      }
      if ((item as any).optionSelections?.length) {
        for (const sel of (item as any).optionSelections) {
          const group = product.optionGroups?.getItems().find((g: any) => g.id === sel.groupId);
          if (group) {
            for (const optionId of sel.optionIds) {
              const option = group.options.getItems().find((o: any) => o.id === optionId);
              if (option) {
                itemExtras += Math.round(parseFloat(option.price) * 100);
              }
            }
          }
        }
      }
      const fullUnitCents = unitPriceCents + itemExtras;
      eligibleAmountCents += fullUnitCents * item.quantity;
      eligibleQuantity += item.quantity;
    }

    const eligibleAmount = eligibleAmountCents / 100;

    // 10. Check min quantity
    if (coupon.minQuantity > 0 && eligibleQuantity < coupon.minQuantity) {
      return { valid: false, reason: `Quantidade mínima de ${coupon.minQuantity} itens elegíveis não atingida` };
    }

    // 10b. Check min order amount
    const minAmount = parseFloat(coupon.minOrderAmount);
    if (minAmount > 0 && eligibleAmount < minAmount) {
      return { valid: false, reason: `Valor mínimo de R$${minAmount.toFixed(2)} em itens elegíveis não atingido` };
    }

    // 11. Calculate discount
    let discountCents: number;
    const discountValue = parseFloat(coupon.discountValue);

    if (coupon.discountType === 'percentage') {
      discountCents = Math.round(eligibleAmountCents * (discountValue / 100));
      // Cap at maxDiscount
      if (coupon.maxDiscount) {
        const maxDiscountCents = Math.round(parseFloat(coupon.maxDiscount) * 100);
        discountCents = Math.min(discountCents, maxDiscountCents);
      }
    } else {
      // fixed
      discountCents = Math.round(discountValue * 100);
    }

    // Discount can't exceed eligible amount
    discountCents = Math.min(discountCents, eligibleAmountCents);

    const calculatedDiscount = discountCents / 100;

    if (calculatedDiscount <= 0) {
      return { valid: false, reason: 'Nenhum item elegível para desconto' };
    }

    return {
      valid: true,
      coupon,
      calculatedDiscount,
      eligibleAmount,
    };
  }

  // ─── Admin CRUD ───────────────────────────────────────────────────

  async listAll() {
    const em = this.em.fork();
    const coupons = await em.find(Coupon, {}, { orderBy: { createdAt: 'DESC' } });
    return coupons.map((c) => this.format(c));
  }

  async create(dto: CreateCouponDto) {
    const em = this.em.fork();
    const upperCode = dto.code.toUpperCase();

    const existing = await em.findOne(Coupon, { code: upperCode });
    if (existing) {
      throw new BadRequestException('Já existe um cupom com este código');
    }

    const coupon = em.create(Coupon, {
      code: upperCode,
      discountType: dto.discountType,
      discountValue: dto.discountValue.toFixed(2),
      maxDiscount: dto.maxDiscount != null ? dto.maxDiscount.toFixed(2) : undefined,
      minOrderAmount: dto.minOrderAmount != null ? dto.minOrderAmount.toFixed(2) : '0',
      minQuantity: dto.minQuantity ?? 0,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      validDays: dto.validDays ?? undefined,
      validTimeFrom: dto.validTimeFrom ?? undefined,
      validTimeTo: dto.validTimeTo ?? undefined,
      maxUses: dto.maxUses ?? 0,
      maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 0,
      currentUses: 0,
      firstOrderOnly: dto.firstOrderOnly ?? false,
      excludePromotional: dto.excludePromotional ?? false,
      deliveryTypeRestriction: dto.deliveryTypeRestriction ?? undefined,
      applicableProductIds: dto.applicableProductIds ?? undefined,
      applicableCategoryIds: dto.applicableCategoryIds ?? undefined,
      applicableSectionIds: dto.applicableSectionIds ?? undefined,
      isActive: dto.isActive ?? true,
    });

    await em.flush();
    return this.format(coupon);
  }

  async update(id: string, dto: UpdateCouponDto) {
    const em = this.em.fork();
    const coupon = await em.findOne(Coupon, { id });
    if (!coupon) throw new NotFoundException('Cupom não encontrado');

    if (dto.code !== undefined) {
      const upperCode = dto.code.toUpperCase();
      const existing = await em.findOne(Coupon, { code: upperCode, id: { $ne: id } });
      if (existing) throw new BadRequestException('Já existe um cupom com este código');
      coupon.code = upperCode;
    }
    if (dto.discountType !== undefined) coupon.discountType = dto.discountType;
    if (dto.discountValue !== undefined) coupon.discountValue = dto.discountValue.toFixed(2);
    if (dto.maxDiscount !== undefined) coupon.maxDiscount = dto.maxDiscount != null ? dto.maxDiscount.toFixed(2) : undefined;
    if (dto.minOrderAmount !== undefined) coupon.minOrderAmount = dto.minOrderAmount.toFixed(2);
    if (dto.minQuantity !== undefined) coupon.minQuantity = dto.minQuantity;
    if (dto.validFrom !== undefined) coupon.validFrom = dto.validFrom ? new Date(dto.validFrom) : undefined;
    if (dto.validUntil !== undefined) coupon.validUntil = dto.validUntil ? new Date(dto.validUntil) : undefined;
    if (dto.validDays !== undefined) coupon.validDays = dto.validDays ?? undefined;
    if (dto.validTimeFrom !== undefined) coupon.validTimeFrom = dto.validTimeFrom ?? undefined;
    if (dto.validTimeTo !== undefined) coupon.validTimeTo = dto.validTimeTo ?? undefined;
    if (dto.maxUses !== undefined) coupon.maxUses = dto.maxUses;
    if (dto.maxUsesPerCustomer !== undefined) coupon.maxUsesPerCustomer = dto.maxUsesPerCustomer;
    if (dto.firstOrderOnly !== undefined) coupon.firstOrderOnly = dto.firstOrderOnly;
    if (dto.excludePromotional !== undefined) coupon.excludePromotional = dto.excludePromotional;
    if (dto.deliveryTypeRestriction !== undefined) coupon.deliveryTypeRestriction = dto.deliveryTypeRestriction ?? undefined;
    if (dto.applicableProductIds !== undefined) coupon.applicableProductIds = dto.applicableProductIds ?? undefined;
    if (dto.applicableCategoryIds !== undefined) coupon.applicableCategoryIds = dto.applicableCategoryIds ?? undefined;
    if (dto.applicableSectionIds !== undefined) coupon.applicableSectionIds = dto.applicableSectionIds ?? undefined;
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;

    await em.flush();
    return this.format(coupon);
  }

  async toggleActive(id: string) {
    const em = this.em.fork();
    const coupon = await em.findOne(Coupon, { id });
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    coupon.isActive = !coupon.isActive;
    await em.flush();
    return this.format(coupon);
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private format(coupon: Coupon) {
    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: parseFloat(coupon.discountValue),
      maxDiscount: coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : null,
      minOrderAmount: parseFloat(coupon.minOrderAmount),
      minQuantity: coupon.minQuantity,
      validFrom: coupon.validFrom?.toISOString() ?? null,
      validUntil: coupon.validUntil?.toISOString() ?? null,
      validDays: coupon.validDays ?? null,
      validTimeFrom: coupon.validTimeFrom ?? null,
      validTimeTo: coupon.validTimeTo ?? null,
      maxUses: coupon.maxUses,
      maxUsesPerCustomer: coupon.maxUsesPerCustomer,
      currentUses: coupon.currentUses,
      firstOrderOnly: coupon.firstOrderOnly,
      excludePromotional: coupon.excludePromotional,
      deliveryTypeRestriction: coupon.deliveryTypeRestriction ?? null,
      applicableProductIds: coupon.applicableProductIds ?? null,
      applicableCategoryIds: coupon.applicableCategoryIds ?? null,
      applicableSectionIds: coupon.applicableSectionIds ?? null,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt!.toISOString(),
      updatedAt: coupon.updatedAt!.toISOString(),
    };
  }
}
