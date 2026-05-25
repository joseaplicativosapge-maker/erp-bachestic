import { useState, useEffect } from "react";
import { Trash2, Shirt } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/src/pages/components/Modal";
import { Input } from "@/src/pages/components/Input";
import { Select } from "@/src/pages/components/Select";
import { api } from "@/src/services/api";
import type { Order, OrderItem, OrderStatus, User } from "@/src/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZES = ["2","4","6","8","10","12","14","16","S","M","L","XL","XXL"];

const DOC_TYPE_OPTIONS = [
  { value: "CC",        label: "CC"        },
  { value: "NIT",       label: "NIT"       },
  { value: "CE",        label: "CE"        },
  { value: "TI",        label: "TI"        },
  { value: "Pasaporte", label: "Pasaporte" },
];

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "Abono confirmado",      label: "Abono confirmado"      },
  { value: "En diseño",             label: "En diseño"             },
  { value: "Versión enviada",       label: "Versión enviada"       },
  { value: "Corrección solicitada", label: "Corrección solicitada" },
  { value: "Diseño aprobado",       label: "Diseño aprobado"       },
  { value: "En cuadro",             label: "En cuadro"             },
  { value: "En montaje",            label: "En montaje"            },
  { value: "En impresión",          label: "En impresión"          },
  { value: "En sublimación",        label: "En sublimación"        },
  { value: "En corte",              label: "En corte"              },
  { value: "En confección",         label: "En confección"         },
  { value: "En empaque",            label: "En empaque"            },
  { value: "En despacho",           label: "En despacho"           },
  { value: "Entregado",             label: "Entregado"             },
];

const EMPTY_ITEM: Partial<OrderItem> = {
  item_name: "", player_name: "", number: "", size: "",
  sleeve: "", design_type: "", fit: "", garment_type: "Camiseta",
  observations: "", sewing_price: 0, sale_price: 0,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditOrderProps {
  order:        Order;
  items:        OrderItem[];
  onCancel:     () => void;
  onSuccess:    () => void;
  user:         User;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditOrder({ order, items: initialItems, onCancel, onSuccess, user }: EditOrderProps) {
  const [formData, setFormData] = useState({
    client_name:     order.client_name,
    client_doc:      order.client_doc,
    client_doc_type: order.client_doc_type || "CC",
    client_phone:    order.client_phone,
    client_address:  order.client_address,
    client_city:     order.client_city,
    delivery_date:   order.delivery_date,
    total_amount:    order.total_amount,
    status:          order.status,
  });

  const [items,          setItems]          = useState<Partial<OrderItem>[]>(initialItems);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (item.sale_price || 0), 0);
    setFormData(prev => ({ ...prev, total_amount: total }));
  }, [items]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const updateItem = (idx: number, field: keyof OrderItem, value: string) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const removeItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx));

  const addItem = () =>
    setItems(prev => [...prev, { ...EMPTY_ITEM }]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    try {
      await api.updateOrder(order.id, { ...formData, user_name: user.name });
      await api.addItems(order.id, items);

      if (referenceFiles.length > 0) {
        const refsFormData = new FormData();
        referenceFiles.forEach(file => refsFormData.append("references", file));
        await api.uploadReferences(order.id, refsFormData, user.name);
      }

      toast.success("Orden actualizada correctamente");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar la orden");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={`Editar Orden #${order.id}`}
      subtitle="Modifica los detalles de la orden"
    >
      <div className="space-y-8">

        {/* CLIENT FIELDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Input label="Nombre Cliente" value={formData.client_name}
            onChange={e => setFormData(prev => ({ ...prev, client_name: e.target.value }))} />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <Select label="Tipo" value={formData.client_doc_type} options={DOC_TYPE_OPTIONS}
                onChange={e => setFormData(prev => ({ ...prev, client_doc_type: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Input label="Documento" value={formData.client_doc}
                onChange={e => setFormData(prev => ({ ...prev, client_doc: e.target.value }))} />
            </div>
          </div>

          <Input label="Teléfono" value={formData.client_phone}
            onChange={e => setFormData(prev => ({ ...prev, client_phone: e.target.value }))} />

          <Input label="Ciudad" value={formData.client_city}
            onChange={e => setFormData(prev => ({ ...prev, client_city: e.target.value }))} />

          <div className="md:col-span-2">
            <Input label="Dirección" value={formData.client_address}
              onChange={e => setFormData(prev => ({ ...prev, client_address: e.target.value }))} />
          </div>

          <Input label="Fecha Entrega" type="date" value={formData.delivery_date}
            onChange={e => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
            className="[color-scheme:dark]" />

          <Input label="Total" type="number" value={formData.total_amount}
            onChange={e => setFormData(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
            readOnly />

          <div className="md:col-span-2">
            <Select label="Estado" value={formData.status} options={STATUS_OPTIONS}
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as OrderStatus }))} />
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h4 className="font-black text-2xl tracking-tight text-foreground-main">Uniformes</h4>
            <button
              onClick={addItem}
              className="h-12 px-6 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-[0.25em] hover:scale-[1.03] transition-all shadow-xl shadow-accent/20"
            >
              + Agregar
            </button>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-border-custom bg-surface shadow-2xl shadow-black/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">

                <thead className="bg-surface-hover border-b border-border-custom">
                  <tr className="text-[9px] uppercase font-black tracking-[0.25em] text-foreground-muted">
                    {["Jugador", "Número", "Talla", "Manga", "Tipo", "Horma", "Observaciones", "Acción"].map((h, i) => (
                      <th key={h} className={`py-5 px-${i === 0 || i === 6 ? "5" : "4"} ${i >= 1 && i <= 5 ? "text-center" : i === 7 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-border-custom">
                  {items.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-surface-hover/60 transition-all">

                      {/* JUGADOR */}
                      <td className="py-4 px-5">
                        <input type="text" value={item.player_name || ""} placeholder="Nombre del jugador"
                          onChange={e => updateItem(idx, "player_name", e.target.value)}
                          className="w-full h-11 rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background px-4 outline-none font-bold text-sm text-foreground-main transition-all" />
                      </td>

                      {/* NÚMERO */}
                      <td className="py-4 px-4">
                        <input type="text" value={item.number || ""} placeholder="00"
                          onChange={e => updateItem(idx, "number", e.target.value)}
                          className="w-16 h-11 mx-auto rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none text-center font-black text-foreground-main transition-all" />
                      </td>

                      {/* TALLA */}
                      <td className="py-4 px-4">
                        <select value={item.size || ""} onChange={e => updateItem(idx, "size", e.target.value)}
                          className="h-11 min-w-[90px] rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none px-3 text-center text-[11px] font-black uppercase text-foreground-main transition-all">
                          <option value="">Talla</option>
                          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>

                      {/* MANGA */}
                      <td className="py-4 px-4">
                        <select value={item.sleeve || ""} onChange={e => updateItem(idx, "sleeve", e.target.value)}
                          className="h-11 min-w-[110px] rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none px-3 text-center text-[11px] font-black uppercase text-foreground-main transition-all">
                          <option value="">Manga</option>
                          <option value="Corta">Corta</option>
                          <option value="Larga">Larga</option>
                        </select>
                      </td>

                      {/* TIPO */}
                      <td className="py-4 px-4">
                        <select value={item.design_type || ""} onChange={e => updateItem(idx, "design_type", e.target.value)}
                          className="h-11 min-w-[120px] rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none px-3 text-center text-[11px] font-black uppercase text-foreground-main transition-all">
                          <option value="">Tipo</option>
                          <option value="Jugador">Jugador</option>
                          <option value="Portero">Portero</option>
                        </select>
                      </td>

                      {/* HORMA */}
                      <td className="py-4 px-4">
                        <select value={item.fit || ""} onChange={e => updateItem(idx, "fit", e.target.value)}
                          className="h-11 min-w-[120px] rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none px-3 text-center text-[11px] font-black uppercase text-foreground-main transition-all">
                          <option value="">Horma</option>
                          <option value="Hombre">Hombre</option>
                          <option value="Dama">Dama</option>
                        </select>
                      </td>

                      {/* OBSERVACIONES */}
                      <td className="py-4 px-5">
                        <input type="text" value={item.observations || ""} placeholder="Observaciones..."
                          onChange={e => updateItem(idx, "observations", e.target.value)}
                          className="w-full h-11 rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background px-4 outline-none text-sm text-foreground-muted transition-all" />
                      </td>

                      {/* DELETE */}
                      <td className="py-4 px-5 text-right">
                        <button onClick={() => removeItem(idx)}
                          className="w-11 h-11 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center ml-auto">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <div className="space-y-4">
                          <Shirt size={42} className="mx-auto text-foreground-muted/20" />
                          <div>
                            <p className="text-sm font-black text-foreground-main">No hay uniformes agregados</p>
                            <p className="text-[10px] uppercase tracking-[0.25em] font-black text-foreground-muted mt-2">Agrega el primer uniforme</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between pt-6 border-t border-border-custom">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted/20 mb-1">Total Costura</p>
            <p className="text-xl font-black text-accent tracking-tighter">
              ${items.reduce((sum, item) => sum + (item.sewing_price || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onCancel}
              className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-foreground-muted hover:text-foreground-main transition-colors">
              Cancelar
            </button>
            <button onClick={handleSubmit}
              className="bg-accent text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-accent/20">
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}