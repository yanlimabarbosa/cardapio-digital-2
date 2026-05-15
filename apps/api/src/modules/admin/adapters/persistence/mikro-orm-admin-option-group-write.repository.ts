import { OptionGroup, Product } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import {
  AdminOptionGroupSelectionPolicy,
  InvalidAdminOptionGroupSelectionError,
} from '../../domain/admin-option-group-selection.policy';
import type {
  AdminOptionGroupMutationModel,
  AdminOptionGroupWriteRepository,
  CreateAdminOptionGroupData,
  CreateAdminOptionGroupOutcome,
  ReorderAdminOptionGroupItem,
  UpdateAdminOptionGroupData,
  UpdateAdminOptionGroupOutcome,
} from '../../application/ports/admin-option-group-write.repository.port';

type UpdateSelectionResult =
  | { readonly status: 'valid' }
  | { readonly message: string; readonly status: 'invalid-selection-range' };

export class MikroOrmAdminOptionGroupWriteRepository implements AdminOptionGroupWriteRepository {
  public async create(
    productId: string,
    data: CreateAdminOptionGroupData,
    context: TransactionContext,
  ): Promise<CreateAdminOptionGroupOutcome> {
    const em = getMikroOrmEntityManager(context);
    const product = await em.findOne(Product, { id: productId });

    if (!product) {
      return { status: 'product-not-found' };
    }

    const count = await em.count(OptionGroup, { product });
    const optionGroup = em.create(OptionGroup, {
      product,
      name: data.name,
      minSelections: data.minSelections,
      maxSelections: data.maxSelections,
      sortOrder: data.sortOrder ?? count,
    });

    await em.flush();

    return { status: 'created', optionGroup: this.toMutationModel(optionGroup) };
  }

  public async reorder(
    items: readonly ReorderAdminOptionGroupItem[],
    context: TransactionContext,
  ): Promise<void> {
    const em = getMikroOrmEntityManager(context);

    for (const item of items) {
      const optionGroup = await em.findOne(OptionGroup, { id: item.id });

      if (optionGroup) {
        optionGroup.sortOrder = item.sortOrder;
      }
    }

    await em.flush();
  }

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    const em = getMikroOrmEntityManager(context);
    const optionGroup = await em.findOne(OptionGroup, { id });

    if (!optionGroup) {
      return false;
    }

    optionGroup.isArchived = true;

    await em.flush();

    return true;
  }

  public async update(
    id: string,
    data: UpdateAdminOptionGroupData,
    context: TransactionContext,
  ): Promise<UpdateAdminOptionGroupOutcome> {
    const em = getMikroOrmEntityManager(context);
    const optionGroup = await em.findOne(OptionGroup, { id });

    if (!optionGroup) {
      return { status: 'option-group-not-found' };
    }

    const selectionResult = this.resolveUpdateSelection(optionGroup, data);

    if (selectionResult.status === 'invalid-selection-range') {
      return selectionResult;
    }

    if (data.name !== undefined) {
      optionGroup.name = data.name;
    }

    if (data.minSelections !== undefined) {
      optionGroup.minSelections = data.minSelections;
    }

    if (data.maxSelections !== undefined) {
      optionGroup.maxSelections = data.maxSelections;
    }

    if (data.sortOrder !== undefined) {
      optionGroup.sortOrder = data.sortOrder;
    }

    if (data.isActive !== undefined) {
      optionGroup.isActive = data.isActive;
    }

    await em.flush();

    return { status: 'updated', optionGroup: this.toMutationModel(optionGroup) };
  }

  private resolveUpdateSelection(
    optionGroup: OptionGroup,
    data: UpdateAdminOptionGroupData,
  ): UpdateSelectionResult {
    try {
      AdminOptionGroupSelectionPolicy.for({
        minSelections: optionGroup.minSelections,
        maxSelections: optionGroup.maxSelections,
      }).resolveForUpdate({
        minSelections: data.minSelections,
        maxSelections: data.maxSelections,
      });

      return { status: 'valid' };
    } catch (error: unknown) {
      if (error instanceof InvalidAdminOptionGroupSelectionError) {
        return { status: 'invalid-selection-range', message: error.message };
      }

      throw error;
    }
  }

  private toMutationModel(optionGroup: OptionGroup): AdminOptionGroupMutationModel {
    return {
      id: optionGroup.id,
      name: optionGroup.name,
      minSelections: optionGroup.minSelections ?? 0,
      maxSelections: optionGroup.maxSelections ?? 1,
      sortOrder: optionGroup.sortOrder ?? 0,
      isActive: optionGroup.isActive ?? true,
      options: [],
    };
  }
}
