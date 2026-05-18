'use client';

import { Info } from 'lucide-react';

export function SectionCard({ title, icon, description, children }: {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[12px] shadow-card">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-navy-100/40">
        <span className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 shrink-0 mt-0.5">
          {icon}
        </span>
        <div>
          <h3 className="font-semibold text-navy-800">{title}</h3>
          {description && <p className="text-xs text-navy-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children, col }: {
  label: string;
  hint?: string;
  col?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={col ? 'col-span-1' : ''}>
      <label className="block text-sm font-medium text-navy-700 mb-1.5">{label}</label>
      {children}
      {hint && (
        <p className="flex items-start gap-1 text-xs text-navy-400 mt-1.5">
          <Info size={11} className="mt-0.5 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-4 py-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 mt-0.5 ${
          checked ? 'bg-primary-500' : 'bg-navy-200'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
      <div>
        <span className="text-sm font-medium text-navy-700">{label}</span>
        {hint && <p className="text-xs text-navy-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}