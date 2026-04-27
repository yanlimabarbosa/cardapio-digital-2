'use client';

interface FieldProps {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, icon, error, required, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-[#8A6F40]">
        {icon}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
