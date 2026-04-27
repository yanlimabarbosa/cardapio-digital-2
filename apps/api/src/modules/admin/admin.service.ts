import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Category, Product, ProductExtra, Order, OptionGroup } from '../../entities';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateExtraDto } from './dto/create-extra.dto';
import { UpdateExtraDto } from './dto/update-extra.dto';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto';

@Injectable()
export class AdminService {
  constructor(private readonly em: EntityManager) {}

  // ─── Categories ──────────────────────────────────────

  async listCategories() {
    const categories = await this.em.find(
      Category,
      {},
      { orderBy: { sortOrder: 'ASC' }, populate: ['products'] },
    );
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: c.products.length,
      createdAt: c.createdAt,
    }));
  }

  async createCategory(dto: CreateCategoryDto) {
    const category = this.em.create(Category, {
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder ?? 0,
    });
    await this.em.flush();
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.em.findOne(Category, { id });
    if (!category) throw new NotFoundException('Category not found');
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    await this.em.flush();
    return category;
  }

  async reorderCategories(items: { id: string; sortOrder: number }[]) {
    for (const item of items) {
      const cat = await this.em.findOne(Category, { id: item.id });
      if (cat) cat.sortOrder = item.sortOrder;
    }
    await this.em.flush();
    return { success: true };
  }

  async deleteCategory(id: string) {
    const category = await this.em.findOne(Category, { id });
    if (!category) throw new NotFoundException('Category not found');
    category.isActive = false;
    await this.em.flush();
    return { success: true };
  }

  // ─── Products ────────────────────────────────────────

  async listProducts() {
    const products = await this.em.find(
      Product,
      {},
      { populate: ['category', 'extras', 'optionGroups', 'optionGroups.options'], orderBy: { category: { sortOrder: 'ASC' }, sortOrder: 'ASC', name: 'ASC' } },
    );
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: parseFloat(p.price),
      imageUrl: p.imageUrl,
      isActive: p.isActive,
      isCompound: p.isCompound ?? false,
      categoryId: p.category.id,
      categoryName: p.category.name,
      extras: p.extras.getItems()
        .filter((e) => !e.optionGroup)
        .map((e) => ({
          id: e.id,
          name: e.name,
          price: parseFloat(e.price),
          sortOrder: e.sortOrder ?? 0,
          isActive: e.isActive,
        })),
      optionGroups: p.optionGroups.getItems()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((g) => ({
          id: g.id,
          name: g.name,
          minSelections: g.minSelections ?? 0,
          maxSelections: g.maxSelections ?? 1,
          sortOrder: g.sortOrder ?? 0,
          isActive: g.isActive ?? true,
          options: g.options.getItems()
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((o) => ({
              id: o.id,
              name: o.name,
              price: parseFloat(o.price),
              sortOrder: o.sortOrder ?? 0,
              isActive: o.isActive ?? true,
            })),
        })),
      sortOrder: p.sortOrder ?? 0,
      isRedeemable: p.isRedeemable ?? false,
      redemptionCost: p.redemptionCost ?? 0,
      createdAt: p.createdAt,
    }));
  }

  async reorderProducts(items: { id: string; sortOrder: number }[]) {
    for (const item of items) {
      const prod = await this.em.findOne(Product, { id: item.id });
      if (prod) prod.sortOrder = item.sortOrder;
    }
    await this.em.flush();
    return { success: true };
  }

  async createProduct(dto: CreateProductDto) {
    const category = await this.em.findOne(Category, { id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');

    const product = this.em.create(Product, {
      name: dto.name,
      category,
      price: dto.price.toFixed(2),
      description: dto.description,
      imageUrl: dto.imageUrl,
      isCompound: dto.isCompound ?? false,
      isRedeemable: dto.isRedeemable ?? false,
      redemptionCost: dto.redemptionCost ?? 0,
    });
    await this.em.flush();
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.em.findOne(Product, { id }, { populate: ['category'] });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.categoryId) {
      const category = await this.em.findOne(Category, { id: dto.categoryId });
      if (!category) throw new NotFoundException('Category not found');
      product.category = category;
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.price !== undefined) product.price = dto.price.toFixed(2);
    if (dto.imageUrl !== undefined) product.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    // Promotional fields
    if (dto.isPromotional !== undefined) product.isPromotional = dto.isPromotional;
    if (dto.promotionalPrice !== undefined) product.promotionalPrice = dto.promotionalPrice != null ? dto.promotionalPrice.toFixed(2) : undefined;
    if (dto.promotionStartDate !== undefined) product.promotionStartDate = dto.promotionStartDate ? new Date(dto.promotionStartDate) : undefined;
    if (dto.promotionEndDate !== undefined) product.promotionEndDate = dto.promotionEndDate ? new Date(dto.promotionEndDate) : undefined;

    // Compound product
    if (dto.isCompound !== undefined) product.isCompound = dto.isCompound;

    // Loyalty fields
    if (dto.isRedeemable !== undefined) product.isRedeemable = dto.isRedeemable;
    if (dto.redemptionCost !== undefined) product.redemptionCost = dto.redemptionCost;

    // Clear promo price when disabling promotion
    if (dto.isPromotional === false) {
      product.promotionalPrice = undefined;
      product.promotionStartDate = undefined;
      product.promotionEndDate = undefined;
    }

    await this.em.flush();
    return product;
  }

  async toggleProduct(id: string) {
    const product = await this.em.findOne(Product, { id });
    if (!product) throw new NotFoundException('Product not found');
    product.isActive = !product.isActive;
    await this.em.flush();
    return { id: product.id, isActive: product.isActive };
  }

  async deleteProduct(id: string) {
    const product = await this.em.findOne(Product, { id });
    if (!product) throw new NotFoundException('Product not found');
    product.isActive = false;
    await this.em.flush();
    return { success: true };
  }

  // ─── Featured ───────────────────────────────────────

  async listFeatured() {
    const products = await this.em.find(
      Product,
      { isFeatured: true },
      { populate: ['category'], orderBy: { featuredOrder: 'ASC' } },
    );
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: parseFloat(p.price),
      imageUrl: p.imageUrl,
      categoryName: p.category.name,
      featuredOrder: p.featuredOrder ?? 0,
    }));
  }

  async setFeatured(productIds: string[]) {
    // Remove all current featured
    const currentFeatured = await this.em.find(Product, { isFeatured: true });
    for (const p of currentFeatured) {
      p.isFeatured = false;
      p.featuredOrder = 0;
    }

    // Set new featured with order
    for (let i = 0; i < productIds.length; i++) {
      const product = await this.em.findOne(Product, { id: productIds[i] });
      if (product) {
        product.isFeatured = true;
        product.featuredOrder = i;
      }
    }

    await this.em.flush();
    return { success: true };
  }

  // ─── Extras ──────────────────────────────────────────

  async listExtras(productId: string) {
    const product = await this.em.findOne(Product, { id: productId }, { populate: ['extras'] });
    if (!product) throw new NotFoundException('Product not found');
    return product.extras.getItems().map((e) => ({
      id: e.id,
      name: e.name,
      price: parseFloat(e.price),
      isActive: e.isActive,
    }));
  }

  async createExtra(productId: string, dto: CreateExtraDto) {
    const product = await this.em.findOne(Product, { id: productId });
    if (!product) throw new NotFoundException('Product not found');

    const extra = this.em.create(ProductExtra, {
      product,
      name: dto.name,
      price: dto.price.toFixed(2),
    });
    await this.em.flush();
    return extra;
  }

  async updateExtra(id: string, dto: UpdateExtraDto) {
    const extra = await this.em.findOne(ProductExtra, { id });
    if (!extra) throw new NotFoundException('Extra not found');

    if (dto.name !== undefined) extra.name = dto.name;
    if (dto.price !== undefined) extra.price = dto.price.toFixed(2);
    if (dto.isActive !== undefined) extra.isActive = dto.isActive;

    await this.em.flush();
    return extra;
  }

  async deleteExtra(id: string) {
    const extra = await this.em.findOne(ProductExtra, { id });
    if (!extra) throw new NotFoundException('Extra not found');
    extra.isActive = false;
    await this.em.flush();
    return { success: true };
  }

  // ─── Option Groups ───────────────────────────────────

  async listOptionGroups(productId: string) {
    const product = await this.em.findOne(Product, { id: productId }, { populate: ['optionGroups', 'optionGroups.options'] });
    if (!product) throw new NotFoundException('Product not found');
    return product.optionGroups.getItems()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((g) => ({
        id: g.id,
        name: g.name,
        minSelections: g.minSelections ?? 0,
        maxSelections: g.maxSelections ?? 1,
        sortOrder: g.sortOrder ?? 0,
        isActive: g.isActive ?? true,
        options: g.options.getItems()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((o) => ({
            id: o.id,
            name: o.name,
            price: parseFloat(o.price),
            sortOrder: o.sortOrder ?? 0,
            isActive: o.isActive ?? true,
          })),
      }));
  }

  async createOptionGroup(productId: string, dto: CreateOptionGroupDto) {
    const product = await this.em.findOne(Product, { id: productId });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.minSelections !== undefined && dto.maxSelections !== undefined && dto.minSelections > dto.maxSelections) {
      throw new BadRequestException('minSelections cannot be greater than maxSelections');
    }

    const count = await this.em.count(OptionGroup, { product });
    const group = this.em.create(OptionGroup, {
      product,
      name: dto.name,
      minSelections: dto.minSelections ?? 0,
      maxSelections: dto.maxSelections ?? 1,
      sortOrder: dto.sortOrder ?? count,
    });
    await this.em.flush();
    return { id: group.id, name: group.name, minSelections: group.minSelections, maxSelections: group.maxSelections, sortOrder: group.sortOrder, isActive: group.isActive, options: [] };
  }

  async updateOptionGroup(id: string, dto: UpdateOptionGroupDto) {
    const group = await this.em.findOne(OptionGroup, { id });
    if (!group) throw new NotFoundException('Option group not found');

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.minSelections !== undefined) group.minSelections = dto.minSelections;
    if (dto.maxSelections !== undefined) group.maxSelections = dto.maxSelections;
    if (dto.sortOrder !== undefined) group.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) group.isActive = dto.isActive;

    const min = group.minSelections ?? 0;
    const max = group.maxSelections ?? 1;
    if (min > max) {
      throw new BadRequestException('minSelections cannot be greater than maxSelections');
    }

    await this.em.flush();
    return group;
  }

  async deleteOptionGroup(id: string) {
    const group = await this.em.findOne(OptionGroup, { id });
    if (!group) throw new NotFoundException('Option group not found');
    group.isActive = false;
    await this.em.flush();
    return { success: true };
  }

  async reorderOptionGroups(items: { id: string; sortOrder: number }[]) {
    for (const item of items) {
      const group = await this.em.findOne(OptionGroup, { id: item.id });
      if (group) group.sortOrder = item.sortOrder;
    }
    await this.em.flush();
    return { success: true };
  }

  // ─── Group Options (options within an option group) ─

  async createGroupOption(groupId: string, dto: CreateExtraDto) {
    const group = await this.em.findOne(OptionGroup, { id: groupId }, { populate: ['product', 'options'] });
    if (!group) throw new NotFoundException('Option group not found');

    const count = group.options.length;
    const option = this.em.create(ProductExtra, {
      product: group.product,
      optionGroup: group,
      name: dto.name,
      price: dto.price.toFixed(2),
      sortOrder: count,
    });
    await this.em.flush();
    return { id: option.id, name: option.name, price: parseFloat(option.price), sortOrder: option.sortOrder, isActive: option.isActive };
  }

  async updateGroupOption(id: string, dto: UpdateExtraDto) {
    const option = await this.em.findOne(ProductExtra, { id });
    if (!option) throw new NotFoundException('Option not found');

    if (dto.name !== undefined) option.name = dto.name;
    if (dto.price !== undefined) option.price = dto.price.toFixed(2);
    if (dto.isActive !== undefined) option.isActive = dto.isActive;

    await this.em.flush();
    return option;
  }

  async deleteGroupOption(id: string) {
    const option = await this.em.findOne(ProductExtra, { id });
    if (!option) throw new NotFoundException('Option not found');
    option.isActive = false;
    await this.em.flush();
    return { success: true };
  }

  async reorderGroupOptions(items: { id: string; sortOrder: number }[]) {
    for (const item of items) {
      const option = await this.em.findOne(ProductExtra, { id: item.id });
      if (option) option.sortOrder = item.sortOrder;
    }
    await this.em.flush();
    return { success: true };
  }

  // ─── Orders ──────────────────────────────────────────

  async listOrdersHistory(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    const { page, limit, search, status, from, to } = params;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (from) {
      where.createdAt = { ...where.createdAt, $gte: new Date(from) };
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, $lte: toDate };
    }

    if (search) {
      const q = search.trim();
      const asNumber = parseInt(q, 10);
      if (!isNaN(asNumber) && q === String(asNumber)) {
        where.orderNumber = asNumber;
      } else {
        where.customerName = { $ilike: `%${q}%` };
      }
    }

    const [orders, total] = await this.em.findAndCount(Order, where, {
      populate: ['items'],
      orderBy: { createdAt: 'DESC' },
      limit,
      offset: (page - 1) * limit,
    });

    return {
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status,
        totalAmount: parseFloat(o.totalAmount),
        deliveryFee: o.deliveryFee ? parseFloat(o.deliveryFee) : null,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        deliveryType: o.deliveryType || 'pickup',
        deliveryAddress: o.deliveryAddress,
        itemCount: o.items.length,
        items: o.items.getItems().map((item) => ({
          id: item.id,
          productName: item.productName,
          unitPrice: parseFloat(item.unitPrice),
          quantity: item.quantity,
          subtotal: parseFloat(item.subtotal),
          extras: item.extras,
          groupedExtras: item.groupedExtras ?? null,
        })),
        createdAt: o.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listOrders(status?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeStatuses = ['pending_payment', 'paid', 'preparing', 'ready', 'out_for_delivery'];
    const where: any = status
      ? { status }
      : [{ status: { $in: activeStatuses } }, { createdAt: { $gte: today } }];

    const orders = await this.em.find(Order, where, {
      populate: ['items'],
      orderBy: { createdAt: 'DESC' },
      limit: 200,
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      status: o.status,
      totalAmount: parseFloat(o.totalAmount),
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      deliveryType: o.deliveryType || 'pickup',
      itemCount: o.items.length,
      items: o.items.getItems().map((item) => ({
        id: item.id,
        productName: item.productName,
        unitPrice: parseFloat(item.unitPrice),
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
        extras: item.extras,
        groupedExtras: item.groupedExtras ?? null,
      })),
      createdAt: o.createdAt,
    }));
  }

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's orders
    const todayOrders = await this.em.find(Order, {
      createdAt: { $gte: today },
    }, { populate: ['items'] });

    const paidOrders = todayOrders.filter((o) =>
      ['paid', 'preparing', 'ready', 'out_for_delivery', 'delivered'].includes(o.status!),
    );

    const revenueCents = paidOrders.reduce(
      (sum, o) => sum + Math.round(parseFloat(o.totalAmount) * 100),
      0,
    );
    const revenue = revenueCents / 100;

    const byStatus: Record<string, number> = {};
    for (const o of todayOrders) {
      byStatus[o.status!] = (byStatus[o.status!] || 0) + 1;
    }

    // Revenue by hour (today)
    const revenueByHour: { hour: number; revenue: number; orders: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hourOrders = paidOrders.filter((o) => o.createdAt!.getHours() === h);
      if (hourOrders.length > 0 || h >= 6 && h <= 23) {
        revenueByHour.push({
          hour: h,
          revenue: hourOrders.reduce((s, o) => s + Math.round(parseFloat(o.totalAmount) * 100), 0) / 100,
          orders: hourOrders.length,
        });
      }
    }

    // Top selling products (today)
    const productCounts: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const order of paidOrders) {
      for (const item of order.items.getItems()) {
        if (!productCounts[item.productName]) {
          productCounts[item.productName] = { name: item.productName, qty: 0, revenue: 0 };
        }
        productCounts[item.productName].qty += item.quantity;
        productCounts[item.productName].revenue += Math.round(parseFloat(item.subtotal) * 100) / 100;
      }
    }
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

    // Payment method breakdown
    const byPayment: Record<string, number> = {};
    for (const o of paidOrders) {
      byPayment[o.paymentMethod!] = (byPayment[o.paymentMethod!] || 0) + 1;
    }

    // Last 7 days revenue
    const weeklyRevenue: { date: string; revenue: number; orders: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - d);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayOrders = await this.em.find(Order, {
        createdAt: { $gte: day, $lt: nextDay },
        status: { $in: ['paid', 'preparing', 'ready', 'out_for_delivery', 'delivered'] as any },
      });

      weeklyRevenue.push({
        date: day.toISOString().split('T')[0],
        revenue: dayOrders.reduce((s, o) => s + Math.round(parseFloat(o.totalAmount) * 100), 0) / 100,
        orders: dayOrders.length,
      });
    }

    // Average ticket
    const avgTicket = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

    return {
      todayOrdersCount: todayOrders.length,
      todayPaidCount: paidOrders.length,
      todayRevenue: revenue,
      avgTicket,
      ordersByStatus: byStatus,
      revenueByHour,
      topProducts,
      byPayment,
      weeklyRevenue,
    };
  }
}
