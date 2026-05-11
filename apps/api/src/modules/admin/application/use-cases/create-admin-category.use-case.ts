import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminCategoryMutationModel,
  AdminCategoryWriteRepository,
  CreateAdminCategoryData,
} from '../ports/admin-category-write.repository.port';

export type CreateAdminCategoryCommand = CreateAdminCategoryData;

export class CreateAdminCategoryUseCase {
  public constructor(
    private readonly categories: AdminCategoryWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateAdminCategoryCommand): Promise<AdminCategoryMutationModel> {
    return this.unitOfWork.run((context) => this.categories.create(command, context));
  }
}
