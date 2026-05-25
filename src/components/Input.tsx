import { cn } from "@/src/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">
        {label}
      </label>
      <input
        {...props}
        className={cn(
          "w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main transition-all placeholder:text-foreground-muted/30",
          props.className
        )}
      />
    </div>
  );
}