import { useState, useEffect } from "react";
import { Plus, Users, Edit2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { api } from "../../services/api";
import { Input } from "../components/Input";
import LoadingState from "../components/LoadingState";
import { ErrorMessage } from "../components/ErrorMessage";
import type { Client, Team } from "../../lib/types";

export function TeamManagement({ client, onClose }: { client: Client, onClose: () => void }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // ✅ ERRORES
  const [errors, setErrors] = useState({
    teamName: ''
  });

  useEffect(() => {
    fetchTeams();
  }, [client.id]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const data = await api.getClientTeams(client.id);
      setTeams(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewTeamName('');

    setErrors({
      teamName: ''
    });
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      teamName: ''
    };

    // ✅ VALIDAR VACÍO
    if (!newTeamName.trim()) {
      newErrors.teamName =
        'El nombre del equipo es obligatorio';
    }

    // ✅ VALIDAR DUPLICADO
    const teamExists = teams.some(
      team =>
        team.name.trim().toLowerCase() ===
          newTeamName.trim().toLowerCase() &&
        team.id !== editingTeam?.id
    );

    if (teamExists) {
      newErrors.teamName =
        'Este equipo ya está registrado';
    }

    setErrors(newErrors);

    // ✅ DETENER
    if (newErrors.teamName) {
      return;
    }

    try {
      if (editingTeam) {
        await api.updateTeam(editingTeam.id, {
          name: newTeamName
        });

        toast.success('Equipo actualizado');
      } else {
        await api.createTeam(
          client.id,
          newTeamName
        );

        toast.success('Equipo creado');
      }

      resetForm();

      setIsAdding(false);
      setEditingTeam(null);

      fetchTeams();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar equipo');
    }
  };

  const handleToggleTeam = async (team: Team) => {
    try {
      await api.updateTeam(team.id, {
        active: !team.active
      });

      toast.success(
        `Equipo ${
          team.active
            ? 'desactivado'
            : 'activado'
        }`
      );

      fetchTeams();
    } catch (error) {
      console.error(error);
      toast.error(
        'Error al cambiar estado del equipo'
      );
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xl font-black text-foreground-main uppercase tracking-tight">
            Equipos de {client.name}
          </h4>

          <p className="text-foreground-muted text-[10px] font-black uppercase tracking-widest mt-1">
            Gestiona los equipos asociados a este cliente
          </p>
        </div>

        {!isAdding && (
          <button
            onClick={() => {
              resetForm();
              setEditingTeam(null);
              setIsAdding(true);
            }}
            className="bg-accent text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 transition-all"
          >
            <Plus size={16} />
            Nuevo Equipo
          </button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddTeam}
          className="bg-surface-hover p-6 rounded-2xl border border-border-custom space-y-4"
          noValidate
        >

          {/* NOMBRE EQUIPO */}
          <div>
            <Input
              label="Nombre del Equipo"
              value={newTeamName}
              onChange={e => {
                setNewTeamName(
                  e.target.value
                );

                setErrors(prev => ({
                  ...prev,
                  teamName: ''
                }));
              }}
              placeholder="Ej. Equipo A, Sucursal Norte, etc."
            />

            {errors.teamName && (
              <ErrorMessage
                message={errors.teamName}
              />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingTeam(null);
                resetForm();
              }}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:text-foreground-main"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="bg-accent text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              {editingTeam
                ? 'Actualizar'
                : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingState message="Cargando Equipos" />
      ) : teams.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border-custom rounded-2xl bg-surface-hover">
          <Users
            size={40}
            className="mx-auto text-foreground-muted/20 mb-4"
          />

          <p className="text-foreground-muted text-sm font-bold">
            No hay equipos registrados para este cliente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {teams.map(team => (
            <div
              key={team.id}
              className={cn(
                "flex items-center justify-between p-4 bg-surface rounded-2xl border border-border-custom transition-all",
                !team.active &&
                  "opacity-50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                  <Users size={20} />
                </div>

                <div>
                  <p className="font-bold text-foreground-main">
                    {team.name}
                  </p>

                  <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                    {team.active
                      ? 'Activo'
                      : 'Inactivo'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingTeam(team);

                    setNewTeamName(
                      team.name
                    );

                    setErrors({
                      teamName: ''
                    });

                    setIsAdding(true);
                  }}
                  className="p-2 hover:bg-accent/10 rounded-lg text-foreground-muted hover:text-foreground-main transition-all"
                >
                  <Edit2 size={16} />
                </button>

                <button
                  onClick={() =>
                    handleToggleTeam(team)
                  }
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    team.active
                      ? "hover:bg-accent/20 text-foreground-muted hover:text-accent"
                      : "bg-accent text-white"
                  )}
                >
                  {team.active ? (
                    <Trash2 size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}