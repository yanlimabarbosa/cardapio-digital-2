import { OptionGroup, Product, ProductExtra } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  AdminProductExtraMutationModel,
  AdminProductExtraWriteRepository,
  CreateAdminGroupOptionOutcome,
  CreateAdminProductExtraData,
  CreateAdminProductExtraOutcome,
  ReorderAdminProductExtraItem,
  UpdateAdminProductExtraData,
  UpdateAdminProductExtraOutcome,
} from '../../application/ports/admin-product-extra-write.repository.port';

export class MikroOrmAdminProductExtraWriteRepository implements AdminProductExtraWriteRepository {
  public async create(
    productId: string,
    data: CreateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<CreateAdminProductExtraOutcome> {
    const em = getMikroOrmEntityManager(context);
    const product = await em.findOne(Product, { id: productId });

    if (!product) {
      return { status: 'product-not-found' };
    }

    const extra = em.create(ProductExtra, {
      product,
      name: data.name,
      price: data.price.toFixed(2),
      imageUrl: data.imageUrl,
    });

    await em.flush();

    return { status: 'created', extra: this.toMutationModel(extra) };
  }

  public async createForOptionGroup(
    groupId: string,
    data: CreateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<CreateAdminGroupOptionOutcome> {
    const em = getMikroOrmEntityManager(context);
    const optionGroup = await em.findOne(
      OptionGroup,
      { id: groupId },
      { populate: ['product', 'options'] },
    );

    if (!optionGroup) {
      return { status: 'option-group-not-found' };
    }

    const extra = em.create(ProductExtra, {
      product: optionGroup.product,
      optionGroup,
      name: data.name,
      price: data.price.toFixed(2),
      imageUrl: data.imageUrl,
      sortOrder: optionGroup.options.length,
    });

    await em.flush();

    return { status: 'created', extra: this.toMutationModel(extra) };
  }

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    const em = getMikroOrmEntityManager(context);
    const extra = await em.findOne(ProductExtra, { id });

    if (!extra) {
      return false;
    }

    extra.isActive = false;

    await em.flush();

    return true;
  }

  public async reorder(
    items: readonly ReorderAdminProductExtraItem[],
    context: TransactionContext,
  ): Promise<void> {
    const em = getMikroOrmEntityManager(context);

    for (const item of items) {
      const extra = await em.findOne(ProductExtra, { id: item.id });

      if (extra) {
        extra.sortOrder = item.sortOrder;
      }
    }

    await em.flush();
  }

  public async update(
    id: string,
    data: UpdateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<UpdateAdminProductExtraOutcome> {
    const em = getMikroOrmEntityManager(context);
    const extra = await em.findOne(ProductExtra, { id });

    if (!extra) {
      return { status: 'extra-not-found' };
    }

    if (data.name !== undefined) {
      extra.name = data.name;
    }

    if (data.price !== undefined) {
      extra.price = data.price.toFixed(2);
    }

    if (data.imageUrl !== undefined) {
      extra.imageUrl = data.imageUrl;
    }

    if (data.isActive !== undefined) {
      extra.isActive = data.isActive;
    }

    await em.flush();

    return { status: 'updated', extra: this.toMutationModel(extra) };
  }

  private toMutationModel(extra: ProductExtra): AdminProductExtraMutationModel {
    return {
      id: extra.id,
      name: extra.name,
      price: extra.price,
      imageUrl: extra.imageUrl,
      sortOrder: extra.sortOrder ?? 0,
      isActive: extra.isActive ?? true,
    };
  }
}
