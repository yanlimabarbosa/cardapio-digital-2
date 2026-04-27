'use client';

export function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#EAD8A0] bg-[#FBF6E9] px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-[#8A6F40]">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-[#2A1508]">
          {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}
