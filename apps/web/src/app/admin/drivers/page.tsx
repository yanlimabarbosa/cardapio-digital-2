import { DriversClient } from './_components/drivers-client';

export default function DriversPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#3D2B1F]">Motoboys</h1>
        <p className="mt-1 text-sm text-[#8B7355]">
          Cadastre os entregadores, ative/desative e acompanhe o saldo de fretes.
        </p>
      </div>

      <DriversClient />
    </div>
  );
}
