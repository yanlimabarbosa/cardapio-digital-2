import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DeliveryArea } from '../../entities';
import { normalizeNeighborhood } from '@cardapio/shared';

@Injectable()
export class DeliveryAreasService {
  constructor(private readonly em: EntityManager) {}

  async listActive() {
    const em = this.em.fork();
    const areas = await em.find(DeliveryArea, { isActive: true }, { orderBy: { city: 'ASC', neighborhood: 'ASC' } });
    return areas.map((a) => this.format(a));
  }

  async listAll() {
    const em = this.em.fork();
    const areas = await em.find(DeliveryArea, {}, { orderBy: { city: 'ASC', neighborhood: 'ASC' } });
    return areas.map((a) => this.format(a));
  }

  async findById(id: string) {
    const em = this.em.fork();
    return em.findOne(DeliveryArea, { id });
  }

  async create(dto: { neighborhood: string; city: string; fee: number }) {
    const em = this.em.fork();
    const normalizedKey = normalizeNeighborhood(dto.city + ' ' + dto.neighborhood);

    const existing = await em.findOne(DeliveryArea, { normalizedKey });
    if (existing) {
      throw new BadRequestException('Essa área de entrega já existe');
    }

    const area = em.create(DeliveryArea, {
      neighborhood: dto.neighborhood,
      city: dto.city,
      fee: dto.fee.toFixed(2),
      normalizedKey,
    });

    await em.flush();
    return this.format(area);
  }

  async update(id: string, dto: { neighborhood?: string; city?: string; fee?: number; isActive?: boolean }) {
    const em = this.em.fork();
    const area = await em.findOne(DeliveryArea, { id });
    if (!area) throw new NotFoundException('Área de entrega não encontrada');

    if (dto.neighborhood !== undefined) area.neighborhood = dto.neighborhood;
    if (dto.city !== undefined) area.city = dto.city;
    if (dto.fee !== undefined) area.fee = dto.fee.toFixed(2);
    if (dto.isActive !== undefined) area.isActive = dto.isActive;

    if (dto.neighborhood !== undefined || dto.city !== undefined) {
      const newKey = normalizeNeighborhood(area.city + ' ' + area.neighborhood);
      const existing = await em.findOne(DeliveryArea, { normalizedKey: newKey, id: { $ne: id } });
      if (existing) {
        throw new BadRequestException('Essa área de entrega já existe');
      }
      area.normalizedKey = newKey;
    }

    await em.flush();
    return this.format(area);
  }

  async remove(id: string) {
    const em = this.em.fork();
    const area = await em.findOne(DeliveryArea, { id });
    if (!area) throw new NotFoundException('Área de entrega não encontrada');
    area.isActive = false;
    await em.flush();
  }

  private format(area: DeliveryArea) {
    return {
      id: area.id,
      neighborhood: area.neighborhood,
      city: area.city,
      fee: parseFloat(area.fee),
      normalizedKey: area.normalizedKey,
      isActive: area.isActive ?? true,
    };
  }
}
