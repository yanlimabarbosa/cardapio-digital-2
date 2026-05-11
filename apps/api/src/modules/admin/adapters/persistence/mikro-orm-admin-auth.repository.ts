import type { EntityManager } from '@mikro-orm/postgresql';
import { AdminUser } from '../../../../entities';
import type {
  AdminAuthAccount,
  AdminAuthRepository,
} from '../../application/ports/admin-auth.repository.port';

export class MikroOrmAdminAuthRepository implements AdminAuthRepository {
  public constructor(private readonly em: EntityManager) {}

  public async findByEmail(email: string): Promise<AdminAuthAccount | null> {
    const admin = await this.em.findOne(AdminUser, { email });
    if (!admin) {
      return null;
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      passwordHash: admin.passwordHash,
    };
  }
}
