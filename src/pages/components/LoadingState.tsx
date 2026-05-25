interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Cargando...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-accent/10 rounded-full" />
        <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground-muted/40 animate-pulse">
        {message}
      </p>
    </div>
  );
}