'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Clock, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '../services/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  role: string;
  // Agrega aquí los campos que devuelve tu API
}

interface LoginProps {
  onLogin: (user: User) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Login({ onLogin }: LoginProps) {
  const [pin, setPin]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-submit cuando se completan los 4 dígitos
  useEffect(() => {
    if (pin.length === 4) {
      const timer = setTimeout(() => {
        const form = document.getElementById('login-form') as HTMLFormElement;
        form?.requestSubmit();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [pin]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;

    setLoading(true);
    setError('');

    try {
      const user = await api.login(pin);
      onLogin(user);
    } catch {
      setError('PIN incorrecto. Intenta de nuevo.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => setPin(prev => prev.slice(0, -1));
  const handleClear  = () => setPin('');

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen grid md:grid-cols-[65%_35%] bg-black overflow-hidden">

      {/* ── IZQUIERDA: video + logo ── */}
      <div className="hidden md:block relative overflow-hidden">

        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105"
        >
          <source src="/login.mp4" type="video/mp4" />
        </video>

        {/* Overlays */}
        <div className="absolute inset-0 bg-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,90,0.18),transparent_60%)]" />

        {/* Logo centrado */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-10">
          <img
            src="/erp/logo-bachestic.png"
            alt="Logo Bachestic"
            className="w-[70%] max-w-[450px] object-contain drop-shadow-[0_0_60px_rgba(255,255,255,0.12)]"
          />

          <div className="mt-8 flex items-center gap-3">
            <div className="w-16 h-[1px] bg-white/20" />
            <p className="text-white/60 text-[10px] uppercase tracking-[0.45em] font-black">
              ERP • BACHESTIC SPORT
            </p>
            <div className="w-16 h-[1px] bg-white/20" />
          </div>
        </div>
      </div>

      {/* ── DERECHA: formulario ── */}
      <div className="relative flex items-center justify-center px-6 py-10 bg-background overflow-hidden">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,0,90,0.10),transparent_45%)]" />

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-[380px]"
        >
          <div
            className={cn(
              'relative rounded-[32px] border border-white/5',
              'bg-white/[0.03] backdrop-blur-2xl p-6',
              'shadow-[0_0_60px_rgba(0,0,0,0.45)] overflow-hidden',
            )}
          >
            {/* Brillo decorativo */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent pointer-events-none" />

            {/* Header */}
            <div className="relative text-center mb-6">
              <div
                className={cn(
                  'w-16 h-16 mx-auto mb-4 rounded-[24px]',
                  'bg-accent/10 border border-accent/20',
                  'flex items-center justify-center',
                  'shadow-[0_0_30px_rgba(255,0,90,0.25)]',
                )}
              >
                <Lock className="text-accent" size={28} />
              </div>

              <h1 className="text-2xl font-black tracking-tight text-white">
                Bienvenido
              </h1>
              <p className="text-[11px] text-foreground-muted mt-2 uppercase tracking-[0.25em] font-bold">
                Ingresa tu PIN de acceso
              </p>
            </div>

            {/* Formulario */}
            <form id="login-form" onSubmit={handleSubmit} className="space-y-6 relative">

              {/* Indicadores de PIN */}
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={cn(
                      'w-12 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 backdrop-blur-xl',
                      pin[i]
                        ? 'border-accent bg-accent/10 shadow-[0_0_20px_rgba(255,0,90,0.18)] scale-105'
                        : 'border-border-custom bg-surface-hover/50',
                    )}
                  >
                    {pin[i] && <div className="w-3 h-3 rounded-full bg-accent" />}
                  </div>
                ))}
              </div>

              {/* Mensaje de error */}
              {error && (
                <div
                  className={cn(
                    'text-center text-red-400 text-[10px] font-bold uppercase tracking-widest',
                    'bg-red-500/10 border border-red-500/20 rounded-2xl py-3',
                  )}
                >
                  {error}
                </div>
              )}

              {/* Teclado numérico */}
              <div className="grid grid-cols-3 gap-3">

                {/* Dígitos 1–9 */}
                {['1','2','3','4','5','6','7','8','9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumberClick(num)}
                    disabled={loading}
                    className={cn(
                      'h-14 rounded-2xl bg-white/[0.03] border border-white/5',
                      'backdrop-blur-xl text-xl font-black text-white',
                      'hover:bg-accent/10 hover:border-accent/20 hover:scale-[1.03]',
                      'active:scale-95 transition-all duration-200',
                    )}
                  >
                    {num}
                  </button>
                ))}

                {/* Limpiar */}
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading || pin.length === 0}
                  className={cn(
                    'h-14 rounded-2xl bg-red-500/10 border border-red-500/20',
                    'backdrop-blur-xl text-[10px] font-black uppercase tracking-widest text-red-400',
                    'hover:bg-red-500/20 hover:scale-[1.03]',
                    'active:scale-95 transition-all duration-200 disabled:opacity-30',
                  )}
                >
                  Limpiar
                </button>

                {/* 0 */}
                <button
                  type="button"
                  onClick={() => handleNumberClick('0')}
                  disabled={loading}
                  className={cn(
                    'h-14 rounded-2xl bg-white/[0.03] border border-white/5',
                    'backdrop-blur-xl text-xl font-black text-white',
                    'hover:bg-accent/10 hover:border-accent/20 hover:scale-[1.03]',
                    'active:scale-95 transition-all duration-200',
                  )}
                >
                  0
                </button>

                {/* Borrar último dígito */}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className={cn(
                    'h-14 rounded-2xl bg-white/[0.03] border border-white/5',
                    'backdrop-blur-xl flex items-center justify-center text-white',
                    'hover:bg-red-500/10 hover:border-red-500/20 hover:scale-[1.03]',
                    'active:scale-95 transition-all duration-200',
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Botón de envío */}
              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className={cn(
                  'w-full py-3 rounded-2xl bg-accent disabled:opacity-40',
                  'text-white font-black uppercase tracking-[0.25em] text-sm',
                  'shadow-[0_0_30px_rgba(255,0,90,0.35)]',
                  'hover:scale-[1.02] active:scale-[0.98] transition-all',
                  'flex items-center justify-center gap-3',
                )}
              >
                {loading ? (
                  <>
                    <Clock className="animate-spin" size={18} />
                    Validando
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Entrar
                  </>
                )}
              </button>

            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}