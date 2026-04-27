'use client';

import { useKitchenOrders } from '@/hooks/orders/use-kitchen-orders';
import { useKitchenSocket } from '@/hooks/orders/use-kitchen-socket';
import { OrderKanban } from './order-kanban';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface KitchenContentProps {
  user: any;
  onLogout: () => void;
}

export function KitchenContent({ user, onLogout }: KitchenContentProps) {
  useKitchenSocket();
  const { data: orders, isLoading } = useKitchenOrders();

  return (
    <main className="min-h-dvh bg-terra-50">
      <header className="border-b border-terra-200 bg-white px-4 py-4">
        <div className="container flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-terra-900">Painel da Cozinha</h1>
            <p className="text-sm text-terra-500">
              Pedidos em tempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="mr-1 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <OrderKanban orders={orders || []} />
        )}
      </div>
    </main>
  );
}
