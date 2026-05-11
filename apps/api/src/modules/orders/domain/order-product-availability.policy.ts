import { getCombinedScheduleAvailability, normalizeWeeklySchedule, type WeeklySchedule } from '@cardapio/shared';

export type OrderProductAvailabilityInput = {
  readonly categoryAvailabilitySchedule?: WeeklySchedule | null;
  readonly name: string;
};

export class InvalidOrderProductAvailabilityError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderProductAvailabilityError';
  }
}

export class OrderProductAvailabilityPolicy {
  private constructor(
    private readonly product: OrderProductAvailabilityInput,
    private readonly at: Date,
  ) {
    if (Number.isNaN(this.at.getTime())) {
      throw new Error('Order product availability date must be valid');
    }
  }

  public static for(product: OrderProductAvailabilityInput, at: Date): OrderProductAvailabilityPolicy {
    return new OrderProductAvailabilityPolicy(product, at);
  }

  public assertAvailable(): void {
    const availability = getCombinedScheduleAvailability([
      {
        schedule: normalizeWeeklySchedule(this.product.categoryAvailabilitySchedule),
        defaultAvailable: true,
      },
    ], this.at);

    if (!availability.available) {
      throw new InvalidOrderProductAvailabilityError(
        availability.nextAvailableLabel
          ? `${this.product.name}: ${availability.nextAvailableLabel}`
          : `${this.product.name} indisponível no horário selecionado`,
      );
    }
  }
}
