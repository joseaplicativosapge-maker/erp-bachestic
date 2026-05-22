import React, { useState, useRef } from 'react';
import { Upload, Trash2, ChevronRight, CheckCircle2, Shirt } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Tab = 'shirt' | 'shorts';
type View = 'front' | 'back';

interface Zone {
  id: string;
  n: number | string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isName?: boolean;
  isNum?: boolean;
}

interface ZoneImage {
  /** URL local (blob) o URL remota ya guardada */
  url: string;
  /** File pendiente de subir — undefined si ya está en servidor */
  file?: File;
}

export interface UniformDesignState {
  /** clave = zoneId, valor = url guardada o blob */
  logos: Record<string, string>;
}

interface UniformDesignerProps {
  /** Imágenes ya guardadas en el servidor (zoneId → url) */
  savedLogos?: Record<string, string>;
  /** Si true, solo visualización (sin upload ni borrado) */
  readOnly?: boolean;
  /** Callback cuando el usuario sube o borra una imagen local */
  onZoneChange?: (zoneId: string, file: File | null, previewUrl: string | null) => void;
  playerName?: string;
  playerNumber?: string;
}

// ─── Definición de Zonas ─────────────────────────────────────────────────────

const ZONES: Record<Tab, Record<View, Zone[]>> = {
  shirt: {
    front: [
      { id: 'z2',  n: 2,  label: 'Manga izquierda',      x: 95,  y: 265, w: 180, h: 170 },
      { id: 'z3',  n: 3,  label: 'Manga derecha',         x: 725, y: 265, w: 180, h: 170 },
      { id: 'z12', n: 12, label: 'Logo hombro izq.',      x: 265, y: 220, w: 145, h: 125 },
      { id: 'z16', n: 16, label: 'Escudo hombro der.',    x: 590, y: 220, w: 145, h: 125 },
      { id: 'z1',  n: 1,  label: 'Escudo centro pecho',   x: 375, y: 325, w: 250, h: 205 },
      { id: 'z13', n: 13, label: 'Lateral inferior izq.', x: 190, y: 620, w: 188, h: 235 },
      { id: 'z14', n: 14, label: 'Lateral inferior der.', x: 622, y: 620, w: 188, h: 235 },
      { id: 'z15', n: 15, label: 'Centro inferior',       x: 355, y: 705, w: 290, h: 175 },
    ],
    back: [
      { id: 'zname',   n: 'N', label: 'Nombre espalda',    x: 220, y: 220, w: 560, h: 90,  isName: true },
      { id: 'znumber', n: '#', label: 'Número espalda',    x: 300, y: 330, w: 400, h: 230, isNum: true  },
      { id: 'z8',      n: 8,   label: 'Logo bajo número',  x: 350, y: 605, w: 300, h: 165 },
    ],
  },
  shorts: {
    front: [
      { id: 'snumber', n: '#', label: 'Número pantaloneta',    x: 270, y: 560, w: 120, h: 120, isNum: true },
      { id: 's9',      n: 9,   label: 'Logo derecho frente',   x: 550, y: 500, w: 235, h: 235 },
    ],
    back: [
      { id: 's10', n: 10, label: 'Logo izquierdo espalda', x: 210, y: 500, w: 235, h: 235 },
      { id: 's11', n: 11, label: 'Logo derecho espalda',   x: 550, y: 500, w: 235, h: 235 },
    ],
  },
};

const BASE_IMGS: Record<string, string> = {
  shirt_front:  '/camiseta-frontal.png',
  shirt_back:   '/camiseta-trasera.png',
  shorts_front: '/pantaloneta-frontal.png',
  shorts_back:  '/pantaloneta-trasera.png',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ─── Componente Principal ────────────────────────────────────────────────────

const UniformDesigner: React.FC<UniformDesignerProps> = ({
  savedLogos = {},
  readOnly = false,
  onZoneChange,
  playerName = 'JUGADOR',
  playerNumber = '10',
}) => {
  const [tab, setTab]     = useState<Tab>('shirt');
  const [view, setView]   = useState<View>('front');
  const [selId, setSelId] = useState<string | null>(null);
  // logos locales (blob URL o URL remota ya mostrada)
  const [logos, setLogos] = useState<Record<string, string>>(savedLogos);
  const fileRef           = useRef<HTMLInputElement>(null);
  const pendingId         = useRef<string | null>(null);

  const zones     = ZONES[tab][view];
  const baseKey   = `${tab}_${view}` as keyof typeof BASE_IMGS;
  const baseImg   = BASE_IMGS[baseKey];
  const selZone   = zones.find(z => z.id === selId) ?? null;

  // zonas visibles en la lista lateral (excluye texto dinámico)
  const listZones = zones.filter(z => !z.isName && !z.isNum);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id   = pendingId.current;
    if (!file || !id) return;

    const url = URL.createObjectURL(file);
    setLogos(prev => ({ ...prev, [id]: url }));
    onZoneChange?.(id, file, url);
    e.target.value = '';
  };

  const triggerUpload = (id: string) => {
    pendingId.current = id;
    fileRef.current?.click();
  };

  const removeZone = (id: string) => {
    setLogos(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    onZoneChange?.(id, null, null);
  };

  // ── Overlay SVG ───────────────────────────────────────────────────────────

  const renderOverlay = () => {
    const nv = playerNumber;

    return zones.map(z => {
      const img = logos[z.id];
      const sel = selId === z.id;

      // ─ nombre dinámico
      if (z.isName) {
        const fs = Math.round(z.h * 0.62);
        return (
          <text
            key={z.id}
            x={z.x + z.w / 2}
            y={z.y + z.h * 0.72}
            textAnchor="middle"
            fontSize={fs}
            fontWeight={900}
            letterSpacing={3}
            fill="#111"
            fontFamily="Arial Black, sans-serif"
            opacity={0.85}
          >
            {playerName}
          </text>
        );
      }

      // ─ número dinámico
      if (z.isNum) {
        const fs = Math.round(z.h * 0.75);
        return (
          <text
            key={z.id}
            x={z.x + z.w / 2}
            y={z.y + z.h * 0.72}
            textAnchor="middle"
            fontSize={fs}
            fontWeight={900}
            fill="#111"
            fontFamily="Arial Black, sans-serif"
            opacity={0.85}
            letterSpacing={2}
          >
            {nv}
          </text>
        );
      }

      const stroke = sel ? '#3B82F6' : 'rgba(255,255,255,0.7)';
      const sw     = sel ? 4.5 : 2;
      const fill   = sel ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)';
      const dash   = sel ? '' : '8,5';
      const fs     = Math.min(54, z.h * 0.34);

      return (
        <g
          key={z.id}
          onClick={() => setSelId(prev => prev === z.id ? null : z.id)}
          style={{ cursor: readOnly && !img ? 'default' : 'pointer' }}
        >
          <defs>
            <clipPath id={`cp-${z.id}`}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={8} />
            </clipPath>
          </defs>

          <rect
            x={z.x} y={z.y} width={z.w} height={z.h}
            rx={8}
            fill={img ? 'rgba(255,255,255,0.06)' : fill}
            stroke={img ? (sel ? '#3B82F6' : 'rgba(255,255,255,0.5)') : stroke}
            strokeWidth={sw}
            strokeDasharray={img ? '' : dash}
          />

          {img && (
            <image
              href={img}
              x={z.x} y={z.y} width={z.w} height={z.h}
              preserveAspectRatio="xMidYMid meet"
              clipPath={`url(#cp-${z.id})`}
            />
          )}

          {!img && (
            <text
              x={z.x + z.w / 2}
              y={z.y + z.h * 0.60}
              textAnchor="middle"
              fontSize={fs}
              fontWeight={700}
              fill="white"
              opacity={0.35}
              fontFamily="Arial, sans-serif"
            >
              {z.n}
            </text>
          )}
        </g>
      );
    });
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Tabs camiseta / pantaloneta */}
      <div className="flex gap-2">
        {(['shirt', 'shorts'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setView('front'); setSelId(null); }}
            className={cn(
              'px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border',
              tab === t
                ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                : 'bg-surface-hover text-foreground-muted border-border-custom hover:text-foreground-main',
            )}
          >
            {t === 'shirt' ? 'Camiseta' : 'Pantaloneta'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">

        {/* ── Visor ── */}
        <div className="space-y-3">

          {/* Frente / Espalda */}
          <div className="flex gap-2">
            {(['front', 'back'] as View[]).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => { setView(v); setSelId(null); }}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                  view === v
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface-hover text-foreground-muted border-border-custom',
                )}
              >
                {v === 'front' ? 'Frente' : 'Espalda'}
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div className="relative w-full bg-black rounded-[22px] overflow-hidden border border-border-custom">
            <img
              src={baseImg}
              alt="Uniforme"
              className="block w-full h-auto pointer-events-none"
              onError={e => { (e.currentTarget as HTMLImageElement).style.minHeight = '320px'; }}
            />
            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 w-full h-full"
            >
              {renderOverlay()}
            </svg>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Lista de zonas */}
          <div className="bg-surface rounded-[20px] border border-border-custom p-4 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted mb-3">
              Zonas de diseño
            </p>

            {listZones.map(z => {
              const img = logos[z.id];
              const act = selId === z.id;
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelId(prev => prev === z.id ? null : z.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                    act
                      ? 'border-accent/50 bg-accent/5'
                      : 'border-border-custom hover:bg-surface-hover',
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-surface-hover border border-border-custom flex items-center justify-center text-[9px] font-black text-foreground-muted shrink-0">
                    {z.n}
                  </div>
                  <span className="flex-1 text-left text-[11px] font-bold text-foreground-main truncate">
                    {z.label}
                  </span>
                  {img
                    ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    : <div className="w-6 h-6 rounded-md bg-surface-hover border border-dashed border-border-custom shrink-0" />
                  }
                </button>
              );
            })}
          </div>

          {/* Panel de zona seleccionada */}
          <div className="bg-surface rounded-[20px] border border-border-custom p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted mb-3">
              {selZone ? selZone.label : 'Zona seleccionada'}
            </p>

            {!selZone && (
              <p className="text-[11px] text-foreground-muted text-center py-4">
                Selecciona una zona
              </p>
            )}

            {selZone && !selZone.isName && !selZone.isNum && (() => {
              const img = logos[selZone.id];
              return (
                <div className="space-y-3">
                  {img ? (
                    <>
                      <img
                        src={img}
                        alt={selZone.label}
                        className="w-full max-h-[100px] object-contain rounded-xl border border-border-custom bg-surface-hover"
                      />
                      {!readOnly && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => triggerUpload(selZone.id)}
                            className="flex-1 py-2.5 rounded-xl bg-surface-hover border border-border-custom text-[9px] font-black uppercase tracking-widest text-foreground-muted hover:text-foreground-main transition-all flex items-center justify-center gap-1.5"
                          >
                            <Upload size={12} /> Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => removeZone(selZone.id)}
                            className="py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : readOnly ? (
                    <p className="text-[11px] text-foreground-muted text-center py-4 italic">
                      Sin imagen en esta zona
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerUpload(selZone.id)}
                      className="w-full border-2 border-dashed border-border-custom rounded-[16px] py-6 flex flex-col items-center gap-2 hover:border-accent/40 hover:bg-accent/5 transition-all"
                    >
                      <Upload size={20} className="text-foreground-muted" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                        Subir imagen
                      </p>
                      <p className="text-[9px] text-foreground-muted/50">
                        PNG transparente recomendado
                      </p>
                    </button>
                  )}
                </div>
              );
            })()}

            {selZone && (selZone.isName || selZone.isNum) && (
              <p className="text-[11px] text-foreground-muted text-center py-3 italic">
                Se llena automáticamente con los datos del uniforme
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Input oculto */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default UniformDesigner;