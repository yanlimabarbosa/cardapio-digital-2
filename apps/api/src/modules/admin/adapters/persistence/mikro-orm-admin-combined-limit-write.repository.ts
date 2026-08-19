import { CombinedLimit, Product } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  AdminCombinedLimitMutationModel,
  AdminCombinedLimitWriteRepository,
  CreateAdminCombinedLimitData,
  CreateAdminCombinedLimitOutcome,
  UpdateAdminCombinedLimitData,
  UpdateAdminCombinedLimitOutcome,
} from '../../application/ports/admin-combined-limit-write.repository.port';

export class MikroOrmAdminCombinedLimitWriteRepository implements AdminCombinedLimitWriteRepository {
  public async create(
    productId: string,
    data: CreateAdminCombinedLimitData,
    context: TransactionContext,
  ): Promise<CreateAdminCombinedLimitOutcome> {
    const em = getMikroOrmEntityManager(context);
    const product = await em.findOne(Product, { id: productId });

    if (!product) {
      return { status: 'product-not-found' };
    }

    const combinedLimit = em.create(CombinedLimit, {
      product,
      name: data.name,
      maxSelections: data.maxSelections,
    });

    await em.flush();

    return { status: 'created', combinedLimit: this.toMutationModel(combinedLimit) };
  }

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    const em = getMikroOrmEntityManager(context);
    const combinedLimit = await em.findOne(CombinedLimit, { id });

    if (!combinedLimit) {
      return false;
    }

    combinedLimit.isArchived = true;

    await em.flush();

    return true;
  }

  public async update(
    id: string,
    data: UpdateAdminCombinedLimitData,
    context: TransactionContext,
  ): Promise<UpdateAdminCombinedLimitOutcome> {
    const em = getMikroOrmEntityManager(context);
    const combinedLimit = await em.findOne(CombinedLimit, { id });

    if (!combinedLimit) {
      return { status: 'combined-limit-not-found' };
    }

    if (data.name !== undefined) {
      combinedLimit.name = data.name;
    }

    if (data.maxSelections !== undefined) {
      combinedLimit.maxSelections = data.maxSelections;
    }

    await em.flush();

    return { status: 'updated', combinedLimit: this.toMutationModel(combinedLimit) };
  }

  private toMutationModel(combinedLimit: CombinedLimit): AdminCombinedLimitMutationModel {
    return {
      id: combinedLimit.id,
      name: combinedLimit.name,
      maxSelections: combinedLimit.maxSelections ?? 1,
    };
  }
}
