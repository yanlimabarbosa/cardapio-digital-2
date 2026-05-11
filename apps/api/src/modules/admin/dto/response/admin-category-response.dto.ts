import { WeeklyScheduleDto } from '../shared/weekly-schedule.dto';

export class AdminCategoryResponseDto {
  public constructor(
    /** Category identifier. */
    public readonly id: string,
    /** Category display name. */
    public readonly name: string,
    /** Optional category description. */
    public readonly description: string | undefined,
    /** Optional category image URL. */
    public readonly imageUrl: string | undefined,
    /** Sort position in the admin menu. */
    public readonly sortOrder: number,
    /** Whether the category is currently active. */
    public readonly isActive: boolean,
    /** Weekly availability schedule, or null when no category schedule is configured. */
    public readonly availabilitySchedule: WeeklyScheduleDto | null,
    /** Number of products linked to the category. */
    public readonly productCount: number,
    /** Category creation timestamp. */
    public readonly createdAt: Date | undefined,
  ) {}
}
