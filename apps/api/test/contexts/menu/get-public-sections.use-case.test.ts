import assert from 'node:assert/strict';
import test from 'node:test';
import type { MenuAvailabilityQuery } from '../../../src/modules/menu/application/ports/menu-read-repository.port';
import type { SectionReadRepository } from '../../../src/modules/menu/application/ports/section-read-repository.port';
import type { SectionReadModel } from '../../../src/modules/menu/application/read-models/section.read-model';
import { GetPublicSectionsUseCase } from '../../../src/modules/menu/application/use-cases/get-public-sections.use-case';

type SectionsCall = {
  readonly method: 'getPublicSections';
  readonly query: MenuAvailabilityQuery;
};

test('reads public sections through the section read repository', async (): Promise<void> => {
  const sectionReadRepository = new FakeSectionReadRepository();
  const useCase = new GetPublicSectionsUseCase(sectionReadRepository);

  const result = await useCase.execute({ scheduledFor: '2026-05-06T12:00:00-03:00' });

  assert.deepEqual(result, [sampleSection]);
  assert.deepEqual(sectionReadRepository.calls, [
    {
      method: 'getPublicSections',
      query: { scheduledFor: '2026-05-06T12:00:00-03:00' },
    },
  ]);
});

class FakeSectionReadRepository implements SectionReadRepository {
  public readonly calls: SectionsCall[] = [];

  public async getPublicSections(query: MenuAvailabilityQuery): Promise<readonly SectionReadModel[]> {
    this.calls.push({ method: 'getPublicSections', query });
    return [sampleSection];
  }
}

const sampleSection: SectionReadModel = {
  id: 'section-1',
  label: 'Secao',
  emoji: '',
  availabilitySchedule: null,
  isAvailable: true,
  products: [
    {
      id: 'product-1',
      name: 'Produto',
      price: 10,
      isActive: true,
      isAvailable: true,
      isCompound: false,
      isPromotional: false,
      promotionalPrice: null,
      promotionActive: false,
      effectivePrice: 10,
      extras: [],
    },
  ],
};
