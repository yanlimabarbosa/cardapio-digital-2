import type { MenuReadRepository } from '../ports/menu-read-repository.port';
import type { MenuReadModel } from '../read-models/menu.read-model';

export type GetPublicMenuCommand = {
  readonly scheduledFor?: string;
};

export type GetPublicMenuResult = readonly MenuReadModel[];

export class GetPublicMenuUseCase {
  public constructor(private readonly menuReadRepository: MenuReadRepository) {}

  public execute(command: GetPublicMenuCommand = {}): Promise<GetPublicMenuResult> {
    return this.menuReadRepository.getMenu(command);
  }
}
