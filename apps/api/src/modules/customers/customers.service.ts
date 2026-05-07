import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Customer, Order, Product, LoyaltyTransaction, AdminUser } from '../../entities';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly em: EntityManager) {}

  async identify(phone: string) {
    const normalized = phone.replace(/\D/g, '');
    const customer = await this.em.findOne(Customer, { phone: normalized });

    if (!customer) {
      return { exists: false, action: 'register' as const };
    }

    if (customer.passwordHash) {
      return { exists: true, hasPassword: true, action: 'login' as const };
    }

    // Exists without password → log in directly, regenerate token
    customer.token = crypto.randomUUID();
    await this.em.flush();

    this.logger.log(`Customer identified (no password): ${normalized}`);

    return {
      exists: true,
      hasPassword: false,
      action: 'authenticated' as const,
      token: customer.token,
      customer: this.formatCustomer(customer),
    };
  }

  async register(phone: string, name: string, password: string) {
    const normalized = phone.replace(/\D/g, '');
    const existing = await this.em.findOne(Customer, { phone: normalized });
    if (existing) {
      throw new ConflictException('Telefone já cadastrado');
    }

    const customer = this.em.create(Customer, {
      phone: normalized,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      token: crypto.randomUUID(),
      loyaltyPoints: 0,
      isActive: true,
    });
    await this.em.flush();

    this.logger.log(`Customer registered: ${normalized} — ${name}`);

    const isAdmin = await this.checkIsAdmin(normalized, true);
    return { token: customer.token, customer: this.formatCustomer(customer, isAdmin) };
  }

  async login(phone: string, password: string) {
    const normalized = phone.replace(/\D/g, '');
    const customer = await this.em.findOne(Customer, { phone: normalized });

    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Senha incorreta');
    }

    // Regenerate token (revoke previous session)
    customer.token = crypto.randomUUID();
    await this.em.flush();

    this.logger.log(`Customer logged in: ${normalized}`);

    const isAdmin = await this.checkIsAdmin(normalized, true);
    return { token: customer.token, customer: this.formatCustomer(customer, isAdmin) };
  }

  async setPassword(customer: Customer, password: string) {
    if (customer.passwordHash) {
      throw new ConflictException('Já possui senha cadastrada');
    }
    customer.passwordHash = await bcrypt.hash(password, 10);
    await this.em.flush();

    this.logger.log(`Customer set password: ${customer.phone}`);

    return { customer: this.formatCustomer(customer) };
  }

  async findByToken(token: string): Promise<Customer | null> {
    return this.em.findOne(Customer, { token, isActive: true });
  }

  async findOrCreateByPhone(phone: string, name: string): Promise<Customer> {
    const normalized = phone.replace(/\D/g, '');
    let customer = await this.em.findOne(Customer, { phone: normalized });
    if (!customer) {
      customer = this.em.create(Customer, {
        phone: normalized,
        name,
        token: crypto.randomUUID(),
        loyaltyPoints: 0,
        isActive: true,
      });
      await this.em.flush();
      this.logger.log(`Customer auto-created via order: ${normalized} — ${name}`);
    }
    return customer;
  }

  async getProfile(customer: Customer) {
    const orderCount = await this.em.count(Order, { customer });
    const isAdmin = await this.checkIsAdmin(customer.phone, !!customer.passwordHash);
    return {
      ...this.formatCustomer(customer, isAdmin),
      totalOrders: orderCount,
      memberSince: customer.createdAt!.toISOString(),
    };
  }

  async getOrders(customer: Customer, page: number, limit: number) {
    const [orders, total] = await this.em.findAndCount(
      Order,
      { customer },
      { populate: ['items'], orderBy: { createdAt: 'DESC' }, limit, offset: (page - 1) * limit },
    );
    return {
      orders: orders.map((o) => this.formatOrder(o)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listAll(search?: string) {
    const where: any = {};
    if (search) {
      where.$or = [
        { name: { $like: `%${search}%` } },
        { phone: { $like: `%${search}%` } },
      ];
    }
    const customers = await this.em.find(Customer, where, { orderBy: { createdAt: 'DESC' } });
    const result = [];
    for (const c of customers) {
      const orderCount = await this.em.count(Order, { customer: c });
      result.push({ ...this.formatCustomer(c), totalOrders: orderCount, memberSince: c.createdAt!.toISOString() });
    }
    return result;
  }

  async getLoyalty(customer: Customer, page: number, limit: number) {
    const [transactions, total] = await this.em.findAndCount(
      LoyaltyTransaction,
      { customer },
      { orderBy: { createdAt: 'DESC' }, limit, offset: (page - 1) * limit },
    );
    return {
      balance: customer.loyaltyPoints,
      transactions: transactions.map((t) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        description: t.description ?? null,
        createdAt: t.createdAt!.toISOString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRedeemableProducts(customer: Customer) {
    const products = await this.em.find(
      Product,
      { isRedeemable: true, isActive: true },
      { orderBy: { name: 'ASC' } },
    );
    return {
      balance: customer.loyaltyPoints,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl ?? null,
        price: parseFloat(p.price),
        redemptionCost: p.redemptionCost ?? 0,
        canRedeem: customer.loyaltyPoints >= (p.redemptionCost ?? 0),
      })),
    };
  }

  async adjustPoints(customerId: string, points: number, description?: string) {
    const customer = await this.em.findOne(Customer, { id: customerId });
    if (!customer) throw new NotFoundException('Cliente nao encontrado');

    // Atomically update points — allow negative adjustments but not below zero
    const newBalance = customer.loyaltyPoints + points;
    if (newBalance < 0) {
      throw new BadRequestException('Saldo insuficiente de pontos');
    }

    await this.em.getConnection().execute(
      `UPDATE "customers" SET "loyalty_points" = "loyalty_points" + ? WHERE "id" = ?`,
      [points, customerId],
    );

    // Refresh in memory
    customer.loyaltyPoints = newBalance;

    const transaction = this.em.create(LoyaltyTransaction, {
      customer,
      points,
      type: 'adjustment',
      description: description || (points > 0 ? 'Ajuste manual (credito)' : 'Ajuste manual (debito)'),
    });
    await this.em.flush();

    this.logger.log(`Loyalty adjust: customer=${customer.phone} points=${points} new_balance=${newBalance}`);

    return { balance: newBalance, transaction: { id: transaction.id, points: transaction.points, type: transaction.type } };
  }

  private async checkIsAdmin(phone: string, hasPassword: boolean): Promise<boolean> {
    if (!hasPassword) return false;
    const admin = await this.em.findOne(AdminUser, { phone });
    return !!admin;
  }

  private formatCustomer(customer: Customer, isAdmin = false) {
    return {
      name: customer.name,
      phone: customer.phone,
      hasPassword: !!customer.passwordHash,
      loyaltyPoints: customer.loyaltyPoints,
      isAdmin,
    };
  }

  private formatOrder(order: Order) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount),
      deliveryFee: order.deliveryFee ? parseFloat(order.deliveryFee) : null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryType: order.deliveryType || 'pickup',
      scheduledFor: order.scheduledFor?.toISOString() ?? null,
      items: order.items.getItems().map((item) => ({
        id: item.id,
        productName: item.productName,
        unitPrice: parseFloat(item.unitPrice),
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
        extras: item.extras,
      })),
      createdAt: order.createdAt!.toISOString(),
    };
  }
}
