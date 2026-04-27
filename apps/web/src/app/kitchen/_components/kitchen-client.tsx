'use client';

import { useKitchenPage } from './use-kitchen-page';
import { KitchenContent } from './kitchen-content';

export function KitchenClient() {
  const { user, ready, handleLogout } = useKitchenPage();

  if (!ready) return null;

  return <KitchenContent user={user} onLogout={handleLogout} />;
}
