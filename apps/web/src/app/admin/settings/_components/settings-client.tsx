'use client';

import { StoreSettings } from '../../_components/dashboard-client/store-settings';
import { DriversClient } from './drivers-client';
import { useSettingsPage } from './use-settings-page';

export function SettingsClient() {
  const {
    storeSettings,
    storeStatus,
    storeMode,
    settingsLoading,
    setStoreModeMutation,
    updateSettingsMutation,
  } = useSettingsPage();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#3D2B1F]">Configurações</h1>
        <p className="mt-1 text-sm text-[#8B7355]">
          Ajuste horários, aparência, motoboys, pixels e dados exibidos nos comprovantes.
        </p>
      </div>

      {settingsLoading || !storeSettings ? (
        <div className="h-[32rem] animate-pulse rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] shadow-[0_0_8px_rgba(61,43,31,0.12)]" />
      ) : (
        <StoreSettings
          storeSettings={storeSettings}
          storeStatus={storeStatus}
          storeMode={storeMode}
          onSetMode={(mode) => setStoreModeMutation.mutate(mode)}
          onUpdateSettings={(data) => updateSettingsMutation.mutate(data)}
        />
      )}

      <DriversClient />
    </div>
  );
}
