export type ScheduledOrderResolution = {
  readonly scheduledFor: Date | null;
  readonly targetDate: Date;
};

export type ScheduledOrderValidationFailure = {
  readonly message: string;
  readonly reason: 'invalid' | 'past';
  readonly valid: false;
};

export type ScheduledOrderValidationResult =
  | (ScheduledOrderResolution & { readonly valid: true })
  | ScheduledOrderValidationFailure;

export class ScheduledOrderPolicy {
  private constructor(private readonly now: Date) {
    if (Number.isNaN(now.getTime())) {
      throw new Error('Scheduled order policy requires a valid current date');
    }
  }

  public static at(now: Date): ScheduledOrderPolicy {
    return new ScheduledOrderPolicy(now);
  }

  public resolve(value?: string | null): ScheduledOrderValidationResult {
    if (!value) {
      return {
        valid: true,
        scheduledFor: null,
        targetDate: this.now,
      };
    }

    const scheduledFor = new Date(value);

    if (Number.isNaN(scheduledFor.getTime())) {
      return {
        valid: false,
        reason: 'invalid',
        message: 'Horário agendado inválido',
      };
    }

    if (scheduledFor.getTime() < this.now.getTime() - 60_000) {
      return {
        valid: false,
        reason: 'past',
        message: 'Horário agendado já passou',
      };
    }

    return {
      valid: true,
      scheduledFor,
      targetDate: scheduledFor,
    };
  }
}
