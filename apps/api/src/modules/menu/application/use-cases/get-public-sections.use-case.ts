import type { MenuAvailabilityQuery } from '../ports/menu-read-repository.port';
import type { SectionReadRepository } from '../ports/section-read-repository.port';
import type { SectionReadModel } from '../read-models/section.read-model';

export type GetPublicSectionsCommand = MenuAvailabilityQuery;

export type GetPublicSectionsResult = readonly SectionReadModel[];

export class GetPublicSectionsUseCase {
  public constructor(private readonly sectionReadRepository: SectionReadRepository) {}

  public execute(command: GetPublicSectionsCommand = {}): Promise<GetPublicSectionsResult> {
    return this.sectionReadRepository.getPublicSections(command);
  }
}
