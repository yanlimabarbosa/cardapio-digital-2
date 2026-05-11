import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminSectionReadRepository } from '../../../src/modules/admin/application/ports/admin-section.read-repository.port';
import type { AdminSectionReadModel } from '../../../src/modules/admin/application/read-models/admin-section.read-model';
import { ListAdminSectionsUseCase } from '../../../src/modules/admin/application/use-cases/list-admin-sections.use-case';

test('lists admin sections through the read repository', async (): Promise<void> => {
  const sections: AdminSectionReadModel[] = [createSectionReadModel('section-1')];
  const repository = new FakeAdminSectionReadRepository(sections);
  const useCase = new ListAdminSectionsUseCase(repository);

  const result = await useCase.execute();

  assert.equal(result, sections);
  assert.equal(repository.listCalls, 1);
});

function createSectionReadModel(id: string): AdminSectionReadModel {
  return {
    id,
    label: 'Lunch',
    emoji: ':)',
    sortOrder: 1,
    isActive: true,
    availabilitySchedule: null,
    productCount: 1,
    products: [
      {
        id: 'product-1',
        name: 'Quentinha',
        price: 17,
        imageUrl: '/uploads/quentinha.webp',
      },
    ],
  };
}

class FakeAdminSectionReadRepository implements AdminSectionReadRepository {
  public listCalls = 0;

  public constructor(private readonly sections: readonly AdminSectionReadModel[]) {}

  public async list(): Promise<readonly AdminSectionReadModel[]> {
    this.listCalls += 1;

    return this.sections;
  }
}
