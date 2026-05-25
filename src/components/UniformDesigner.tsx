import React, { useState, useRef } from 'react';
import { Upload, Trash2, CheckCircle2, Download } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Tab  = 'shirt' | 'shorts';
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

export interface UniformDesignState {
  logos: Record<string, string>;
}

interface UniformDesignerProps {
  savedLogos?: Record<string, string>;
  readOnly?: boolean;
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
      { id: 'zname',   n: 'N', label: 'Nombre espalda',   x: 220, y: 220, w: 560, h: 90,  isName: true },
      { id: 'znumber', n: '#', label: 'Número espalda',   x: 300, y: 330, w: 400, h: 230, isNum: true  },
      { id: 'z8',      n: 8,   label: 'Logo bajo número', x: 350, y: 605, w: 300, h: 165 },
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

/**
 * Carga una imagen desde una URL y la devuelve como HTMLImageElement.
 * Para URLs de blob locales funciona directamente.
 * Para URLs remotas se intenta con crossOrigin = 'anonymous'.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Necesario para URLs remotas (evita taint del canvas)
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => {
      // Segundo intento sin crossOrigin (para blobs locales que pueden fallar con él)
      const img2 = new Image();
      img2.onload  = () => resolve(img2);
      img2.onerror = reject;
      img2.src = src;
    };
    img.src = src;
  });
}

/**
 * Descarga una zona individual: imagen base + logo superpuesto en canvas.
 * El canvas usa el viewBox 1000×1000 del SVG como referencia.
 */
async function downloadZone(
  baseImgSrc: string,
  logoSrc: string,
  zone: Zone,
  filename: string,
) {
  const CANVAS_SIZE = 1000;
  const canvas  = document.createElement('canvas');
  canvas.width  = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d')!;

  try {
    // 1. Dibujar imagen base del uniforme
    const base = await loadImage(baseImgSrc);
    ctx.drawImage(base, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 2. Dibujar logo en la zona correspondiente
    const logo = await loadImage(logoSrc);
    ctx.save();
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(zone.x + r, zone.y);
    ctx.lineTo(zone.x + zone.w - r, zone.y);
    ctx.quadraticCurveTo(zone.x + zone.w, zone.y, zone.x + zone.w, zone.y + r);
    ctx.lineTo(zone.x + zone.w, zone.y + zone.h - r);
    ctx.quadraticCurveTo(zone.x + zone.w, zone.y + zone.h, zone.x + zone.w - r, zone.y + zone.h);
    ctx.lineTo(zone.x + r, zone.y + zone.h);
    ctx.quadraticCurveTo(zone.x, zone.y + zone.h, zone.x, zone.y + zone.h - r);
    ctx.lineTo(zone.x, zone.y + r);
    ctx.quadraticCurveTo(zone.x, zone.y, zone.x + r, zone.y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logo, zone.x, zone.y, zone.w, zone.h);
    ctx.restore();
  } catch {
    // Si falla la imagen base, solo descargamos el logo solo
    try {
      const logo = await loadImage(logoSrc);
      ctx.drawImage(logo, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    } catch { return; }
  }

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Descarga solo el logo de la zona (sin fondo del uniforme).
 * Útil como alternativa si la imagen base no carga por CORS.
 */
async function downloadLogoOnly(logoSrc: string, filename: string) {
  try {
    const logo   = await loadImage(logoSrc);
    const canvas = document.createElement('canvas');
    canvas.width  = logo.naturalWidth  || 512;
    canvas.height = logo.naturalHeight || 512;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(logo, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch { /* silencioso */ }
}

// ─── Componente Principal ────────────────────────────────────────────────────

const UniformDesigner: React.FC<UniformDesignerProps> = ({
  savedLogos = {},
  readOnly = false,
  onZoneChange,
  playerName   = 'JUGADOR',
  playerNumber = '10',
}) => {
  const [tab, setTab]     = useState<Tab>('shirt');
  const [view, setView]   = useState<View>('front');
  const [selId, setSelId] = useState<string | null>(null);
  const [logos, setLogos] = useState<Record<string, string>>(savedLogos);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const pendingId  = useRef<string | null>(null);

  const zones    = ZONES[tab][view];
  const baseKey  = `${tab}_${view}` as keyof typeof BASE_IMGS;
  const baseImg  = BASE_IMGS[baseKey];
  const selZone  = zones.find(z => z.id === selId) ?? null;
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
    setLogos(prev => { const n = { ...prev }; delete n[id]; return n; });
    onZoneChange?.(id, null, null);
  };

  const handleDownloadZone = async (zone: Zone) => {
    const logoSrc = logos[zone.id];
    if (!logoSrc) return;
    setDownloading(zone.id);
    try {
      await downloadZone(
        baseImg,
        logoSrc,
        zone,
        `uniforme_${tab}_${view}_${zone.label.replace(/\s+/g, '_').toLowerCase()}.png`,
      );
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadLogoOnly = async (zone: Zone) => {
    const logoSrc = logos[zone.id];
    if (!logoSrc) return;
    setDownloading(zone.id);
    try {
      await downloadLogoOnly(
        logoSrc,
        `logo_${zone.label.replace(/\s+/g, '_').toLowerCase()}.png`,
      );
    } finally {
      setDownloading(null);
    }
  };

  // ── Overlay SVG ───────────────────────────────────────────────────────────

  const renderOverlay = () => {
    return zones.map(z => {
      const img = logos[z.id];
      const sel = selId === z.id;

      if (z.isName) {
        const fs = Math.round(z.h * 0.62);
        return (
          <text key={z.id} x={z.x + z.w / 2} y={z.y + z.h * 0.72}
            textAnchor="middle" fontSize={fs} fontWeight={900} letterSpacing={3}
            fill="#111" fontFamily="Arial Black, sans-serif" opacity={0.85}>
            {playerName}
          </text>
        );
      }

      if (z.isNum) {
        const fs = Math.round(z.h * 0.75);
        return (
          <text key={z.id} x={z.x + z.w / 2} y={z.y + z.h * 0.72}
            textAnchor="middle" fontSize={fs} fontWeight={900}
            fill="#111" fontFamily="Arial Black, sans-serif" opacity={0.85} letterSpacing={2}>
            {playerNumber}
          </text>
        );
      }

      const stroke = sel ? '#3B82F6' : 'rgba(255,255,255,0.7)';
      const sw     = sel ? 4.5 : 2;
      const fill   = sel ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)';
      const dash   = sel ? '' : '8,5';
      const fs     = Math.min(54, z.h * 0.34);

      return (
        <g key={z.id}
          onClick={() => setSelId(prev => prev === z.id ? null : z.id)}
          style={{ cursor: readOnly && !img ? 'default' : 'pointer' }}>
          <defs>
            <clipPath id={`cp-${z.id}`}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={8} />
            </clipPath>
          </defs>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={8}
            fill={img ? 'rgba(255,255,255,0.06)' : fill}
            stroke={img ? (sel ? '#3B82F6' : 'rgba(255,255,255,0.5)') : stroke}
            strokeWidth={sw} strokeDasharray={img ? '' : dash} />
          {img && (
            <image href={img} x={z.x} y={z.y} width={z.w} height={z.h}
              preserveAspectRatio="xMidYMid meet" clipPath={`url(#cp-${z.id})`} />
          )}
          {!img && (
            <text x={z.x + z.w / 2} y={z.y + z.h * 0.60} textAnchor="middle"
              fontSize={fs} fontWeight={700} fill="white" opacity={0.35} fontFamily="Arial, sans-serif">
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

      {/* Tabs */}
      <div className="flex gap-2">
        {(['shirt', 'shorts'] as Tab[]).map(t => (
          <button key={t} type="button"
            onClick={() => { setTab(t); setView('front'); setSelId(null); }}
            className={cn(
              'px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border',
              tab === t
                ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                : 'bg-surface-hover text-foreground-muted border-border-custom hover:text-foreground-main',
            )}>
            {t === 'shirt' ? 'Camiseta' : 'Pantaloneta'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">

        {/* ── Visor ── */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['front', 'back'] as View[]).map(v => (
              <button key={v} type="button"
                onClick={() => { setView(v); setSelId(null); }}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                  view === v
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface-hover text-foreground-muted border-border-custom',
                )}>
                {v === 'front' ? 'Frente' : 'Espalda'}
              </button>
            ))}
          </div>

          <div className="relative w-full bg-black rounded-[22px] overflow-hidden border border-border-custom">
            <img src={baseImg} alt="Uniforme"
              className="block w-full h-auto pointer-events-none"
              onError={e => { (e.currentTarget as HTMLImageElement).style.minHeight = '320px'; }} />
            <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
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
                <div key={z.id} className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setSelId(prev => prev === z.id ? null : z.id)}
                    className={cn(
                      'flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                      act ? 'border-accent/50 bg-accent/5' : 'border-border-custom hover:bg-surface-hover',
                    )}>
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

                  {/* Botón descarga por zona en la lista */}
                  {img && (
                    <button
                      type="button"
                      title={`Descargar logo: ${z.label}`}
                      onClick={() => handleDownloadLogoOnly(z)}
                      disabled={downloading === z.id}
                      className="w-8 h-8 rounded-xl flex items-center justify-center border border-border-custom bg-surface-hover text-foreground-muted hover:text-accent hover:border-accent/40 transition-all disabled:opacity-40"
                    >
                      {downloading === z.id
                        ? <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        : <Download size={13} />
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel zona seleccionada */}
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
                      <img src={img} alt={selZone.label}
                        className="w-full max-h-[100px] object-contain rounded-xl border border-border-custom bg-surface-hover" />

                      {/* Botones de acción cuando hay imagen */}
                      <div className="flex gap-2">
                        {/* Descargar solo logo */}
                        <button type="button"
                          onClick={() => handleDownloadLogoOnly(selZone)}
                          disabled={downloading === selZone.id}
                          className="flex-1 py-2.5 rounded-xl bg-surface-hover border border-border-custom text-[9px] font-black uppercase tracking-widest text-foreground-muted hover:text-accent hover:border-accent/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40">
                          {downloading === selZone.id
                            ? <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            : <Download size={12} />
                          }
                          Logo
                        </button>


                        {!readOnly && (
                          <>
                            <button type="button" onClick={() => triggerUpload(selZone.id)}
                              className="py-2.5 px-3 rounded-xl bg-surface-hover border border-border-custom text-foreground-muted hover:text-foreground-main transition-all">
                              <Upload size={14} />
                            </button>
                            <button type="button" onClick={() => removeZone(selZone.id)}
                              className="py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : readOnly ? (
                    <p className="text-[11px] text-foreground-muted text-center py-4 italic">
                      Sin imagen en esta zona
                    </p>
                  ) : (
                    <button type="button" onClick={() => triggerUpload(selZone.id)}
                      className="w-full border-2 border-dashed border-border-custom rounded-[16px] py-6 flex flex-col items-center gap-2 hover:border-accent/40 hover:bg-accent/5 transition-all">
                      <Upload size={20} className="text-foreground-muted" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                        Subir imagen
                      </p>
                      <p className="text-[9px] text-foreground-muted/50">PNG transparente recomendado</p>
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

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default UniformDesigner;