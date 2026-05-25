import { useState } from "react";
import { Plus, Clock, Users, ChevronRight, CheckCircle2, X } from "lucide-react";
import { api } from "@/src/services/api";
import type { Team } from "@/src/lib/types";

interface NewTeamInlineProps {
  clientId?: number;
  onSelected: (team: { id?: number; name: string }) => void;
}

type Mode = "idle" | "selecting" | "creating";

export function NewTeamInline({ clientId, onSelected }: NewTeamInlineProps) {
  const [mode,          setMode]          = useState<Mode>("idle");
  const [existingTeams, setExistingTeams] = useState<Team[]>([]);
  const [teamName,      setTeamName]      = useState("");
  const [loading,       setLoading]       = useState(false);

  const handleOpen = async () => {
    if (clientId) {
      setLoading(true);
      try {
        const teams  = await api.getClientTeams(clientId);
        const active = teams.filter((t: Team) => t.active);
        setExistingTeams(active);
        setMode(active.length > 0 ? "selecting" : "creating");
      } catch {
        setMode("creating");
      } finally {
        setLoading(false);
      }
    } else {
      setMode("creating");
    }
  };

  const confirmTeam = () => {
    if (!teamName.trim()) return;
    onSelected({ name: teamName.trim() });
    setMode("idle");
    setTeamName("");
  };

  // ── Idle ──────────────────────────────────────────────────────────────────

  if (mode === "idle") {
    return (
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-6 h-[52px] rounded-[20px] border-2 border-dashed border-accent/30 text-accent hover:bg-accent/5 transition-all disabled:opacity-50"
      >
        {loading
          ? <Clock size={14} className="animate-spin" />
          : <Plus size={14} />
        }
        <span className="text-[10px] font-black uppercase tracking-widest">
          {clientId ? "Seleccionar o crear equipo" : "Crear equipo para este cliente"}
        </span>
      </button>
    );
  }

  // ── Selecting ─────────────────────────────────────────────────────────────

  if (mode === "selecting" && existingTeams.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
          Equipos existentes del cliente
        </p>

        <div className="bg-surface-hover rounded-[20px] border border-border-custom overflow-hidden divide-y divide-border-custom">
          {existingTeams.map(team => (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelected({ id: team.id, name: team.name })}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                  <Users size={13} />
                </div>
                <span className="font-black text-sm text-foreground-main uppercase tracking-wide group-hover:text-accent transition-colors">
                  {team.name}
                </span>
              </div>
              <ChevronRight size={14} className="text-foreground-muted group-hover:text-accent transition-colors" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMode("creating")}
          className="w-full flex items-center justify-center gap-2 px-5 h-[44px] rounded-[18px] border border-dashed border-accent/30 text-accent hover:bg-accent/5 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <Plus size={12} /> Crear nuevo equipo
        </button>

        <button
          type="button"
          onClick={() => setMode("idle")}
          className="w-full text-[9px] font-black uppercase tracking-widest text-foreground-muted hover:text-foreground-main transition-colors py-1"
        >
          Cancelar
        </button>
      </div>
    );
  }

  // ── Creating ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {existingTeams.length > 0 && (
        <button
          type="button"
          onClick={() => setMode("selecting")}
          className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-accent/70 transition-colors flex items-center gap-1"
        >
          ← Ver equipos existentes
        </button>
      )}

      <div className="flex items-center gap-3">
        <input
          type="text"
          autoFocus
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmTeam();
            }
          }}
          placeholder="Nombre del equipo..."
          className="flex-1 px-5 py-3 rounded-2xl bg-surface border border-accent/40 focus:border-accent outline-none text-foreground-main font-bold text-sm transition-all"
        />

        <button
          type="button"
          disabled={!teamName.trim()}
          onClick={confirmTeam}
          className="px-5 py-3 rounded-2xl bg-accent text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:scale-105 transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
        >
          <CheckCircle2 size={14} /> Agregar
        </button>

        <button
          type="button"
          onClick={() => { setMode("idle"); setTeamName(""); }}
          className="px-4 py-3 rounded-2xl border border-border-custom text-foreground-muted hover:bg-surface-hover text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}