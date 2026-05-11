import type { MenuAvailabilityQuery } from './menu-read-repository.port';
import type { SectionReadModel } from '../read-models/section.read-model';

export interface SectionReadRepository {
  getPublicSections(query: MenuAvailabilityQuery): Promise<readonly SectionReadModel[]>;
}
