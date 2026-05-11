import { DeliveryAreaReadModel } from './application/read-models/delivery-area.read-model';
import { DeliveryAreaResponseDto } from './dto/response/delivery-area-response.dto';

export function toDeliveryAreaResponseDto(model: DeliveryAreaReadModel): DeliveryAreaResponseDto {
  return new DeliveryAreaResponseDto(
    model.id,
    model.neighborhood,
    model.city,
    model.fee,
    model.normalizedKey,
    model.isActive,
  );
}
