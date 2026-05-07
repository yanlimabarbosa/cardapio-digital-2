'use client';

export function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E8DDD0] bg-[#FFFCF8] px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-[#8B7355]">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-[#3D2B1F]">
          {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}
