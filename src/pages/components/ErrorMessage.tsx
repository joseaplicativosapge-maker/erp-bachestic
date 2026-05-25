interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="mt-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in duration-200">
      <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
        {message}
      </p>
    </div>
  );
}