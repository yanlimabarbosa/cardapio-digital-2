import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmAdminAuthRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-auth.repository';
import { AdminUser } from '../../../src/entities';

test('finds admin auth accounts by email without leaking ORM entities', async (): Promise<void> => {
  const admin = createAdminUser();
  const em = new FakeEntityManager(admin);
  const repository = new MikroOrmAdminAuthRepository(em as unknown as EntityManager);

  const result = await repository.findByEmail('admin@example.com');

  assert.deepEqual(em.findOneCalls, [
    {
      entity: AdminUser,
      where: { email: 'admin@example.com' },
    },
  ]);
  assert.deepEqual(result, {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    passwordHash: 'hash',
  });
});

test('returns null when admin auth account is missing', async (): Promise<void> => {
  const em = new FakeEntityManager(null);
  const repository = new MikroOrmAdminAuthRepository(em as unknown as EntityManager);

  const result = await repository.findByEmail('missing@example.com');

  assert.equal(result, null);
  assert.deepEqual(em.findOneCalls, [
    {
      entity: AdminUser,
      where: { email: 'missing@example.com' },
    },
  ]);
});

function createAdminUser(): AdminUser {
  const admin = new AdminUser();
  admin.id = 'admin-1';
  admin.email = 'admin@example.com';
  admin.name = 'Admin';
  admin.passwordHash = 'hash';
  return admin;
}

type FindOneCall = {
  readonly entity: typeof AdminUser;
  readonly where: { readonly email: string };
};

class FakeEntityManager {
  public readonly findOneCalls: FindOneCall[] = [];

  public constructor(private readonly admin: AdminUser | null) {}

  public async findOne(
    entity: typeof AdminUser,
    where: { readonly email: string },
  ): Promise<AdminUser | null> {
    this.findOneCalls.push({ entity, where });
    return this.admin;
  }
}
