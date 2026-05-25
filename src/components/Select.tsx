import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
}

export function Select({ label, options, ...props }: SelectProps) {
  return (
    <div className="space-y-3 relative">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">
        {label}
      </label>
      <div className="relative">
        <select
          {...props}
          className={cn(
            "w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main transition-all cursor-pointer appearance-none pr-12",
            props.className
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-foreground-main">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-muted">
          <ChevronDown size={18} />
        </div>
      </div>
    </div>
  );
}