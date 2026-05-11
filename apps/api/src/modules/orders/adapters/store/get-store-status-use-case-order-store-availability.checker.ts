import type { GetStoreStatusUseCase } from '../../../../modules/store/application/use-cases/get-store-status.use-case';
import type {
  CheckOrderStoreAvailabilityQuery,
  OrderStoreAvailabilityChecker,
  OrderStoreAvailabilityResult,
} from '../../application/ports/order-store-availability.port';

type StoreStatusUseCase = Pick<GetStoreStatusUseCase, 'execute'>;

export class GetStoreStatusUseCaseOrderStoreAvailabilityChecker implements OrderStoreAvailabilityChecker {
  public constructor(private readonly getStoreStatusUseCase: StoreStatusUseCase) {}

  public async check(query: CheckOrderStoreAvailabilityQuery): Promise<OrderStoreAvailabilityResult> {
    const result = query.scheduledFor
      ? await this.getStoreStatusUseCase.execute({
          at: query.scheduledFor,
          ignoreForceOpen: true,
        })
      : await this.getStoreStatusUseCase.execute();

    return {
      open: result.open,
      reason: result.reason ?? null,
    };
  }
}
