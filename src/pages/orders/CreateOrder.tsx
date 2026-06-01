import { useState, useEffect } from "react";
import {
  Plus, Search, X, Users, ChevronRight,
  Contact, Calculator, Shirt, Package
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { api } from "../../services/api";
import Modal from "../components/Modal";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import type { Client, Order, OrderItem, Payment, Product, Team, User } from "../../lib/types";

// Importa estos dos si los tienes en archivos separados
import { NewTeamInline } from "../components/NewTeamInline";
import { ReceiptModal } from "../components/ReceiptModal";


// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCTS_PER_PAGE = 6;

const PRICE_KEYS_CAMISETA = [
  "price_filetes",
  "price_despuntes",
  "price_collarin",
  "price_dobladillo_remate",
] as const;

const PRICE_KEYS_PANTALONETA = [
  "price_filete_p",
  "price_despuntes_p",
  "price_caucho",
  "price_sentar_caucho",
  "price_collarin_p",
  "price_remate",
] as const;

const ALL_PRICE_KEYS = [...PRICE_KEYS_CAMISETA, ...PRICE_KEYS_PANTALONETA];

const CAMISETA_TASKS = [
  { label: "Filetes",             key: "price_filetes"           },
  { label: "Despuntes",           key: "price_despuntes"         },
  { label: "Collarín",            key: "price_collarin"          },
  { label: "Dobladillo y Remate", key: "price_dobladillo_remate" },
] as const;

const PANTALONETA_TASKS = [
  { label: "Filete",        key: "price_filete_p"      },
  { label: "Despuntes",     key: "price_despuntes_p"   },
  { label: "Caucho",        key: "price_caucho"        },
  { label: "Sentar Caucho", key: "price_sentar_caucho" },
  { label: "Collarín",      key: "price_collarin_p"    },
  { label: "Remate",        key: "price_remate"        },
] as const;

const DOC_TYPE_OPTIONS = [
  { value: "CC",   label: "Cédula de Ciudadanía"              },
  { value: "TI",   label: "Tarjeta de Identidad"              },
  { value: "CE",   label: "Cédula de Extranjería"             },
  { value: "NIT",  label: "NIT"                               },
  { value: "RUT",  label: "RUT"                               },
  { value: "PAS",  label: "Pasaporte"                         },
  { value: "PEP",  label: "Permiso Especial de Permanencia"   },
  { value: "PPT",  label: "Permiso por Protección Temporal"   },
  { value: "RC",   label: "Registro Civil"                    },
  { value: "NUIP", label: "Número Único de Identificación"    },
  { value: "CD",   label: "Carné Diplomático"                 },
  { value: "SC",   label: "Salvoconducto"                     },
];

const EMPTY_FORM = {
  client_id:       undefined as number | undefined,
  team_id:         undefined as number | undefined,
  client_name:     "",
  client_doc:      "",
  client_doc_type: "CC",
  client_phone:    "",
  client_address:  "",
  client_city:     "",
  contact_method:  "WhatsApp",
  delivery_date:   "",
  total_amount:    0,
};


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBusinessDaysFromNow(days: number): string {
  let date = new Date();
  let count = 0;
  while (count < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) count++;
  }
  return date.toISOString().split("T")[0];
}

function computeConfeccionTotal(
  quantities: Record<string, number>,
  products: Product[]
): number {
  let total = 0;
  Object.entries(quantities).forEach(([name, qty]) => {
    if (!qty) return;
    const product = products.find(p => p.name === name) as any;
    if (!product) return;
    const costoConfeccion = ALL_PRICE_KEYS.reduce((s, key) => s + (product[key] || 0), 0);
    total += costoConfeccion > 0
      ? costoConfeccion * qty
      : (product.sale_price || 0) * qty;
  });
  return total;
}


// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateOrderProps {
  onCancel:  () => void;
  onSuccess: () => void;
  user:      User;
}


// ─── Component ────────────────────────────────────────────────────────────────

export function CreateOrder({ onCancel, onSuccess, user }: CreateOrderProps) {

  // ── State ─────────────────────────────────────────────────────────────────
  const [additionalItems, setAdditionalItems] = useState<Partial<OrderItem>[]>([]);
  const [step,             setStep]             = useState(1);
  const [clientSearch,     setClientSearch]     = useState("");
  const [searchResults,    setSearchResults]    = useState<Client[]>([]);
  const [selectedClient,   setSelectedClient]   = useState<Client | null>(null);
  const [clientTeams,      setClientTeams]      = useState<Team[]>([]);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [selectedTeam,     setSelectedTeam]     = useState<{ id?: number; name: string } | null>(null);
  const [newTeamName,      setNewTeamName]      = useState<string | null>(null);
  const [products,         setProducts]         = useState<Product[]>([]);
  const [quantities,       setQuantities]       = useState<Record<string, number>>({});
  const [items,            setItems]            = useState<Partial<OrderItem>[]>([]);
  const [formData,         setFormData]         = useState({ ...EMPTY_FORM, delivery_date: getBusinessDaysFromNow(15) });

  const [productSearch, setProductSearch] = useState("");
  const [productPage,   setProductPage]   = useState(1);

  const [showReceipt,    setShowReceipt]    = useState(false);
  const [createdOrder,   setCreatedOrder]   = useState<Order | null>(null);
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  
  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    api.getProducts().then(data => {
      setProducts(data);
      const initial: Record<string, number> = {};
      data.forEach(p => { initial[p.name] = 0; });
      setQuantities(initial);
    }).catch(console.error);
  }, []);

  // Recalculate total whenever quantities or products change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      total_amount: computeConfeccionTotal(quantities, products),
    }));
  }, [quantities, products]);

  // Debounced client search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (clientSearch.length > 2) {
        try {
          setSearchResults(await api.searchClients(clientSearch));
        } catch { /* silent */ }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const groupedItems = Object.values(
    items.reduce((acc, item) => {
      const key = item.garment_type || "Camiseta";
      if (!acc[key]) acc[key] = { garment_type: key, quantity: 0, sale_price: item.sale_price || 0 };
      acc[key].quantity += 1;
      return acc;
    }, {} as Record<string, { garment_type: string; quantity: number; sale_price: number }>)
  );

  const filteredProductKeys = Object.keys(quantities).filter(name => {
    const product = products.find(p => p.name === name) as any;
    const code = product?.code || "";
    return (
      name.toLowerCase().includes(productSearch.toLowerCase()) ||
      code.toLowerCase().includes(productSearch.toLowerCase())
    );
  });

  const totalProductPages   = Math.ceil(filteredProductKeys.length / PRODUCTS_PER_PAGE);
  const paginatedProductKeys = filteredProductKeys.slice(
    (productPage - 1) * PRODUCTS_PER_PAGE,
    productPage * PRODUCTS_PER_PAGE
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    try {
      const teams = await api.getClientTeams(client.id);
      setClientTeams(teams.filter((t: Team) => t.active));
    } catch { /* silent */ }
    setFormData(prev => ({
      ...prev,
      client_id:       client.id,
      team_id:         undefined,
      client_name:     client.name,
      client_doc:      client.doc,
      client_doc_type: client.doc_type || "CC",
      client_phone:    client.phone,
      client_address:  client.address,
      client_city:     client.city,
    }));
    setClientSearch("");
    setSearchResults([]);
    setIsCreatingClient(false);
    setNewTeamName(null);
  };

  const resetClient = () => {
    setSelectedClient(null);
    setClientTeams([]);
    setIsCreatingClient(false);
    setNewTeamName(null);
    setSelectedTeam(null);
    setFormData(prev => ({
      ...prev,
      client_id: undefined, team_id: undefined,
      client_name: "", client_doc: "",
      client_phone: "", client_address: "", client_city: "",
    }));
  };

  const generateItems = () => {
    const newItems: Partial<OrderItem>[] = [];
    Object.entries(quantities).forEach(([name, qty]) => {
      const product = products.find(p => p.name === name);
      for (let i = 0; i < qty; i++) {
        newItems.push({
          garment_type: name, item_name: "", player_name: "", number: "",
          size: "", sleeve: "", design_type: "", fit: "", observations: "",
          sewing_price: product?.sewing_cost || 0,
          sale_price:   product?.sale_price  || 0,
        });
      }
    });
    setItems(newItems);
    setAdditionalItems([]);  // ← resetea al avanzar
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      let finalClientId = formData.client_id;
      let finalTeamId   = formData.team_id;
      const computedTotal = computeConfeccionTotal(quantities, products);

      if (isCreatingClient) {
        const newClient = await api.createClient({
          name: formData.client_name, doc: formData.client_doc,
          doc_type: formData.client_doc_type, phone: formData.client_phone,
          address: formData.client_address, city: formData.client_city,
        });
        finalClientId = newClient.id;
        if (selectedTeam && finalClientId) {
          try {
            const newTeam = await api.createClientTeam(finalClientId, { name: selectedTeam.name });
            finalTeamId = newTeam.id;
          } catch (err) { console.error("Error creando equipo:", err); }
        }
      } else if (selectedTeam) {
        if (selectedTeam.id) {
          finalTeamId = selectedTeam.id;
        } else if (finalClientId) {
          try {
            const newTeam = await api.createClientTeam(finalClientId, { name: selectedTeam.name });
            finalTeamId = newTeam.id;
          } catch (err) { console.error("Error creando equipo:", err); }
        }
      }

      const { id } = await api.createOrder({
        ...formData,
        total_amount: computedTotal,
        status:       "Abono confirmado",
        client_id:    finalClientId,
        team_id:      finalTeamId,
        user_name:    user.name,
      });

      const allItems = [
        ...items.map(i => ({ ...i, section: 'uniforme' })),
        ...additionalItems.map(i => ({ ...i, section: 'adicional' })),
      ];
      await api.addItems(id, allItems);
      toast.success("Orden creada correctamente");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Error al crear la orden");
    }
  };

  // ── Early return: receipt ─────────────────────────────────────────────────

  if (showReceipt && createdOrder && createdPayment) {
    return (
      <ReceiptModal
        order={createdOrder}
        payment={createdPayment}
        onClose={() => { setShowReceipt(false); onSuccess(); }}
      />
    );
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderCostBreakdown = () => {
    const bloques = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productName, qty]) => {
        const product = products.find(p => p.name === productName) as any;
        if (!product) return null;
        const camActivas  = CAMISETA_TASKS.filter(t  => (product[t.key]  || 0) > 0);
        const pantActivas = PANTALONETA_TASKS.filter(t => (product[t.key] || 0) > 0);
        if (!camActivas.length && !pantActivas.length) return null;
        return {
          label:      productName,
          qty,
          product,
          camActivas,
          pantActivas,
          totalCam:   camActivas.reduce( (s, t) => s + (product[t.key] || 0) * qty, 0),
          totalPant:  pantActivas.reduce((s, t) => s + (product[t.key] || 0) * qty, 0),
        };
      })
      .filter(Boolean) as NonNullable<ReturnType<typeof Object.entries>>[];

    if (!bloques.length) return null;

    const grandTotal = bloques.reduce((t: number, b: any) => t + b.totalCam + b.totalPant, 0);

    return (
      <div className="mt-2 border border-border-custom rounded-[24px] overflow-hidden">
        <div className="px-6 py-4 bg-surface-hover border-b border-border-custom flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted flex items-center gap-2">
            <Calculator size={13} className="text-accent" /> Costos de Confección
          </p>
          <p className="text-[10px] font-black text-accent">Total: ${grandTotal.toLocaleString()}</p>
        </div>

        {bloques.map((bloque: any) => (
          <div key={bloque.label} className="border-b border-border-custom last:border-0">
            <div className="px-6 py-3 bg-foreground-main/[0.03] flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground-main flex items-center gap-2">
                <Shirt size={12} className="text-accent" />
                {bloque.label} — {bloque.qty} uds
              </p>
              <p className="text-[10px] font-black text-foreground-muted">
                ${(bloque.totalCam + bloque.totalPant).toLocaleString()}
              </p>
            </div>

            {bloque.camActivas.length > 0 && (
              <>
                <div className="px-6 py-2 bg-blue-500/5 border-t border-border-custom/60 flex items-center gap-2">
                  <Shirt size={10} className="text-blue-400" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">
                    Camiseta — ${bloque.totalCam.toLocaleString()}
                  </p>
                </div>
                {bloque.camActivas.map(({ label, key }: any) => {
                  const unitPrice = bloque.product[key] || 0;
                  return (
                    <div key={key} className="flex items-center justify-between px-6 py-2 border-t border-border-custom/30 hover:bg-surface-hover/50 transition-colors">
                      <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest pl-4">{label}</span>
                      <div className="flex items-center gap-6 text-[10px]">
                        <span className="text-foreground-muted/60">${unitPrice.toLocaleString()} × {bloque.qty}</span>
                        <span className="font-black w-20 text-right text-foreground-main">${(unitPrice * bloque.qty).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {bloque.pantActivas.length > 0 && (
              <>
                <div className="px-6 py-2 bg-purple-500/5 border-t border-border-custom/60 flex items-center gap-2">
                  <Shirt size={10} className="text-purple-400" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                    Pantaloneta — ${bloque.totalPant.toLocaleString()}
                  </p>
                </div>
                {bloque.pantActivas.map(({ label, key }: any) => {
                  const unitPrice = bloque.product[key] || 0;
                  return (
                    <div key={key} className="flex items-center justify-between px-6 py-2 border-t border-border-custom/30 hover:bg-surface-hover/50 transition-colors">
                      <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest pl-4">{label}</span>
                      <div className="flex items-center gap-6 text-[10px]">
                        <span className="text-foreground-muted/60">${unitPrice.toLocaleString()} × {bloque.qty}</span>
                        <span className="font-black w-20 text-right text-foreground-main">${(unitPrice * bloque.qty).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  const hasSelectedQty = Object.values(quantities).some(q => q > 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Nueva Orden de Producción"
      subtitle={`Paso ${step} de 2: ${step === 1 ? "Información y Cantidades" : "Detalle y Pago"}`}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-8">

        {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-8">

            {/* CLIENT SEARCH */}
            {!selectedClient && !isCreatingClient ? (
              <div className="space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-3 block">
                  Buscar Cliente Existente
                </label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-foreground-muted" size={20} />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 rounded-[24px] bg-surface border border-border-custom focus:border-accent/50 focus:ring-4 focus:ring-accent/10 outline-none text-foreground-main transition-all placeholder:text-foreground-muted/30"
                    placeholder="Nombre o Documento del cliente..."
                  />
                  {clientSearch && (
                    <button onClick={() => setClientSearch("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-accent transition-colors">
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  {!clientSearch.trim() && (
                    <div className="w-full flex items-center gap-4 px-6 h-[60px] bg-surface-hover rounded-[24px] border border-border-custom">
                      <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                        <Search size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                        Escribe el <span className="text-foreground-main">nombre o documento</span> del cliente para buscar
                      </p>
                    </div>
                  )}

                  {clientSearch.trim() && clientSearch.length <= 2 && (
                    <div className="w-full flex items-center gap-4 px-6 h-[60px] bg-surface-hover rounded-[24px] border border-border-custom">
                      <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                        <Search size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                        Escribe al menos <span className="text-foreground-main">3 caracteres</span> para buscar...
                      </p>
                    </div>
                  )}

                  {clientSearch.length > 2 && searchResults.length > 0 && (
                    <div className="w-full bg-surface-hover border border-border-custom rounded-[24px] overflow-hidden">
                      <div className="px-6 h-[40px] flex items-center border-b border-border-custom">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                          {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""} encontrado{searchResults.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-border-custom">
                        {searchResults.map(client => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            className="w-full px-6 h-[60px] text-left hover:bg-accent/10 flex items-center justify-between transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0 group-hover:bg-accent group-hover:text-white transition-all">
                                <Contact size={16} />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-foreground-main group-hover:text-accent transition-colors leading-tight">{client.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-black text-accent bg-accent/10 px-1.5 py-0.5 rounded uppercase tracking-widest">{client.doc_type || "CC"}</span>
                                  <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest">{client.doc} • {client.phone}</p>
                                </div>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-foreground-muted group-hover:text-accent transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {clientSearch.length > 2 && searchResults.length === 0 && (
                    <>
                      <div className="w-full flex items-center gap-4 px-6 h-[60px] bg-surface-hover rounded-[24px] border border-border-custom">
                        <div className="w-8 h-8 bg-foreground-muted/10 rounded-xl flex items-center justify-center text-foreground-muted shrink-0">
                          <Search size={16} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                          Sin resultados para "<span className="text-accent">{clientSearch}</span>"
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsCreatingClient(true);
                          const isDoc = /^[\d\-]+$/.test(clientSearch.trim());
                          setFormData(prev => ({
                            ...prev,
                            client_name: isDoc ? "" : clientSearch,
                            client_doc:  isDoc ? clientSearch : "",
                          }));
                        }}
                        className="w-full flex items-center justify-center gap-3 px-6 h-[60px] rounded-[24px] border-2 border-dashed border-accent/40 text-accent hover:bg-accent/5 transition-all"
                      >
                        <Plus size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Crear nuevo cliente "{clientSearch}"
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>

            ) : (
              <div className="space-y-8">

                {/* CLIENT HEADER */}
                <div className="flex justify-between items-center bg-accent/5 p-6 rounded-[24px] border border-accent/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                      <Contact size={24} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">
                        {isCreatingClient ? "Nuevo Cliente" : "Cliente Seleccionado"}
                      </p>
                      <p className="font-black text-lg text-foreground-main tracking-tight">
                        {formData.client_name || "Completar datos abajo"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {!isCreatingClient && (
                      clientTeams.length > 0 ? (
                        <div className="w-48">
                          <Select
                            label="Equipo"
                            value={formData.team_id?.toString() || ""}
                            onChange={e => setFormData(prev => ({ ...prev, team_id: e.target.value ? Number(e.target.value) : undefined }))}
                            options={[
                              { value: "", label: "Sin Equipo" },
                              ...clientTeams.map(t => ({ value: t.id.toString(), label: t.name })),
                            ]}
                          />
                        </div>
                      ) : (
                        <div className="w-56">
                          {newTeamName ? (
                            <div className="flex items-center justify-between px-4 py-2 bg-accent/10 border border-accent/20 rounded-2xl">
                              <div className="flex items-center gap-2">
                                <Users size={13} className="text-accent" />
                                <p className="font-black text-sm text-foreground-main uppercase tracking-wide">{newTeamName}</p>
                              </div>
                              <button type="button" onClick={() => { setNewTeamName(null); setSelectedTeam(null); }} className="text-foreground-muted hover:text-accent transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <NewTeamInline
                              clientId={formData.client_id}
                              onSelected={team => {
                                setSelectedTeam(team);
                                setNewTeamName(team.name);
                                if (team.id) setFormData(prev => ({ ...prev, team_id: team.id }));
                              }}
                            />
                          )}
                        </div>
                      )
                    )}

                    <button onClick={resetClient} className="text-[10px] font-black text-accent uppercase tracking-widest hover:text-accent/70 transition-colors">
                      {isCreatingClient ? "Cancelar" : "Cambiar Cliente"}
                    </button>
                  </div>
                </div>

                {/* NEW CLIENT FORM */}
                {isCreatingClient && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input label="Nombre Completo" value={formData.client_name} placeholder="Ej. Juan Pérez"
                      onChange={e => setFormData(prev => ({ ...prev, client_name: e.target.value }))} />

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <Select label="Tipo Doc." value={formData.client_doc_type} options={DOC_TYPE_OPTIONS}
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
                      <Input label="Dirección de Envío" value={formData.client_address}
                        onChange={e => setFormData(prev => ({ ...prev, client_address: e.target.value }))} />
                    </div>

                    {/* TEAM */}
                    <div className="md:col-span-2 pt-4 border-t border-border-custom space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted flex items-center gap-2">
                        <Users size={13} className="text-accent" /> Equipo (opcional)
                      </p>
                      {newTeamName ? (
                        <div className="flex items-center justify-between px-5 py-3 bg-accent/10 border border-accent/20 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-accent/20 rounded-xl flex items-center justify-center">
                              <Users size={14} className="text-accent" />
                            </div>
                            <p className="font-black text-sm text-foreground-main uppercase tracking-wide">{newTeamName}</p>
                          </div>
                          <button type="button" onClick={() => { setNewTeamName(null); setSelectedTeam(null); }} className="text-foreground-muted hover:text-accent transition-colors p-1">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <NewTeamInline onSelected={team => { setSelectedTeam(team); setNewTeamName(team.name); }} />
                      )}
                    </div>
                  </div>
                )}

                {/* QUANTITIES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border-custom">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-2">Cantidades por Prenda</h4>

                    {/* Product search */}
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={16} />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); setProductPage(1); }}
                        placeholder="Filtrar por nombre o código..."
                        className="w-full pl-10 pr-10 py-3 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main text-sm placeholder:text-foreground-muted/30 transition-all"
                      />
                      {productSearch && (
                        <button onClick={() => { setProductSearch(""); setProductPage(1); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-accent transition-colors">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Product grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {paginatedProductKeys.map(type => {
                        const product = products.find(p => p.name === type) as any;
                        const code = product?.code || "";
                        return (
                          <div key={type} className={cn(
                            "bg-surface-hover p-4 rounded-2xl border transition-all space-y-3",
                            quantities[type] > 0 ? "border-accent/30 bg-accent/5" : "border-border-custom"
                          )}>
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-foreground-main leading-tight">{type}</p>
                                {code && <p className="text-[9px] font-black uppercase tracking-widest text-accent mt-0.5">{code}</p>}
                                {product?.category && (
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-foreground-muted/60 mt-0.5">
                                    {product.category}
                                  </p>
                                )}
                              </div>
                              
                              {quantities[type] > 0 && (
                                <span className="shrink-0 text-[9px] font-black bg-accent text-white px-2 py-0.5 rounded-full">
                                  {quantities[type]}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 justify-end">
                              <button onClick={() => setQuantities(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }))}
                                className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-foreground-muted hover:text-accent transition-colors border border-border-custom font-black">−</button>
                              <span className="w-8 text-center font-black text-foreground-main">{quantities[type]}</span>
                              <button onClick={() => setQuantities(prev => ({ ...prev, [type]: prev[type] + 1 }))}
                                className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-foreground-muted hover:text-accent transition-colors border border-border-custom font-black">+</button>
                            </div>
                          </div>
                        );
                      })}

                      {paginatedProductKeys.length === 0 && (
                        <div className="col-span-2 text-center py-10 bg-surface-hover rounded-2xl border border-dashed border-border-custom">
                          <Search size={28} className="mx-auto text-foreground-muted/20 mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted/50">
                            Sin resultados para "{productSearch}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Product pagination */}
                    {totalProductPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border-custom text-foreground-muted hover:text-foreground-main hover:border-accent/40 disabled:opacity-30 transition-all">
                          ← Ant.
                        </button>
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                          Pág. {productPage} / {totalProductPages}
                          <span className="text-foreground-muted/50 ml-2">({filteredProductKeys.length} productos)</span>
                        </span>
                        <button onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))} disabled={productPage === totalProductPages}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border-custom text-foreground-muted hover:text-foreground-main hover:border-accent/40 disabled:opacity-30 transition-all">
                          Sig. →
                        </button>
                      </div>
                    )}

                    {/* Selected summary */}
                    {hasSelectedQty && (
                      <div className="pt-4 border-t border-border-custom space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Seleccionados</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(quantities).filter(([_, qty]) => qty > 0).map(([name, qty]) => {
                            const product = products.find(p => p.name === name) as any;
                            return (
                              <div key={name} className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
                                <span className="text-[10px] font-black text-foreground-main">{name}</span>
                                {product?.code && <span className="text-[9px] font-black text-accent">{product.code}</span>}
                                <span className="text-[10px] font-black text-white bg-accent rounded-full w-5 h-5 flex items-center justify-center">{qty}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Cost breakdown */}
                    {hasSelectedQty && renderCostBreakdown()}
                  </div>

                  {/* Right column */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Input label="Fecha Estimada Entrega" type="date" value={formData.delivery_date}
                        onChange={e => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                        className="[color-scheme:dark]" />
                      <Input label="Costo de Confección" type="number" value={formData.total_amount}
                        onChange={e => setFormData(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                        className="font-black text-xl tracking-tighter" readOnly />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">

            {/* Cliente header */}
            <div className="flex justify-between items-center bg-accent/5 p-6 rounded-[24px] border border-accent/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                  <Contact size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">Cliente</p>
                  <p className="font-black text-lg text-foreground-main tracking-tight">{formData.client_name}</p>
                  {(formData.team_id || newTeamName) && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-accent mt-0.5 flex items-center gap-1">
                      <Users size={10} />
                      {newTeamName || clientTeams.find(t => t.id === formData.team_id)?.name}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-[10px] font-black text-accent uppercase tracking-widest hover:text-accent/70 transition-colors"
              >
                Volver
              </button>
            </div>

            {/* ── UNIFORMES ── */}
            <div className="space-y-4">
              <h4 className="font-black text-xl tracking-tight text-foreground-main uppercase flex items-center gap-3">
                <Shirt size={20} className="text-accent" /> Listado de Uniformes
                <span className="text-xs font-black bg-surface-hover border border-border-custom text-foreground-muted px-2.5 py-1 rounded-full">
                  {items.length} uds
                </span>
              </h4>
              <div className="overflow-x-auto border border-border-custom rounded-[32px] bg-surface-hover">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-surface-hover text-[9px] uppercase font-black tracking-[0.2em] text-foreground-muted">
                      <th className="py-5 px-6">Prenda</th>
                      <th className="py-5 px-6">Código</th>
                      <th className="py-5 px-6 text-center">Cant.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {groupedItems.map((group, idx) => {
                      const product = products.find(p => p.name === group.garment_type) as any;
                      return (
                        <tr key={idx} className="hover:bg-surface-hover transition-colors">
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className="text-foreground-muted font-bold text-[10px] uppercase">{group.garment_type}</span>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className="text-accent font-black text-[10px] uppercase tracking-widest">{product?.code || "—"}</span>
                          </td>
                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <span className="font-black text-foreground-main text-[10px]">{group.quantity}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── PRODUCTOS ADICIONALES ── */}
            <div className="space-y-4 pt-6 border-t border-border-custom">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xl tracking-tight text-foreground-main uppercase flex items-center gap-3">
                  <Package size={20} className="text-accent" />
                  Productos Adicionales
                  {additionalItems.length > 0 && (
                    <span className="text-xs font-black bg-accent text-white px-2.5 py-1 rounded-full">
                      {additionalItems.length}
                    </span>
                  )}
                </h4>
                <button
                  onClick={() => setAdditionalItems(prev => [
                    ...prev,
                    { garment_type: "", player_name: "", number: "", size: "",
                      sleeve: "", design_type: "", fit: "", observations: "",
                      sewing_price: 0, sale_price: 0 },
                  ])}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-dashed border-accent/40 text-accent hover:bg-accent/5 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>

              {additionalItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 rounded-[24px] border border-dashed border-border-custom bg-surface-hover/50 text-center">
                  <Package size={28} className="text-foreground-muted/20 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted/50">Sin productos adicionales</p>
                  <p className="text-[9px] text-foreground-muted/30 mt-1">Chaquetas, medias, camisetas individuales, etc.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {additionalItems.map((item, idx) => (
                    <div key={idx} className="p-5 rounded-[24px] border border-border-custom bg-surface-hover space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                          <Package size={12} /> Producto #{idx + 1}
                        </p>
                        <button
                          onClick={() => setAdditionalItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-foreground-muted hover:text-accent transition-colors p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="col-span-2 md:col-span-3">
                          <Input
                            label="Tipo de Prenda"
                            value={item.garment_type || ""}
                            placeholder="Ej. Chaqueta, Medias, Camiseta individual..."
                            onChange={e => setAdditionalItems(prev =>
                              prev.map((it, i) => i === idx ? { ...it, garment_type: e.target.value } : it)
                            )}
                          />
                        </div>
                        <Input label="Nombre / Jugador" value={item.player_name || ""} placeholder="Ej. Carlos García"
                          onChange={e => setAdditionalItems(prev => prev.map((it, i) => i === idx ? { ...it, player_name: e.target.value } : it))} />
                        <Input label="Número" value={item.number || ""} placeholder="Ej. 10"
                          onChange={e => setAdditionalItems(prev => prev.map((it, i) => i === idx ? { ...it, number: e.target.value } : it))} />
                        <Input label="Talla" value={item.size || ""} placeholder="XS / S / M / L / XL"
                          onChange={e => setAdditionalItems(prev => prev.map((it, i) => i === idx ? { ...it, size: e.target.value } : it))} />
                        <Input label="Manga" value={item.sleeve || ""} placeholder="Corta / Larga"
                          onChange={e => setAdditionalItems(prev => prev.map((it, i) => i === idx ? { ...it, sleeve: e.target.value } : it))} />
                        <Input label="Tipo Diseño" value={item.design_type || ""} placeholder="Sublimación / Bordado..."
                          onChange={e => setAdditionalItems(prev => prev.map((it, i) => i === idx ? { ...it, design_type: e.target.value } : it))} />
                        <Input label="Fit / Horma" value={item.fit || ""} placeholder="Regular / Ajustado"
                          onChange={e => setAdditionalItems(prev => prev.map((it, i) => i === idx ? { ...it, fit: e.target.value } : it))} />
                        <div className="col-span-2 md:col-span-3">
                          <Input label="Observaciones" value={item.observations || ""} placeholder="Detalles especiales..."
                            onChange={e => setAdditionalItems(prev => prev.map((it, i) => i === idx ? { ...it, observations: e.target.value } : it))} />
                        </div>
                        <Input label="Precio Confección" type="number" value={item.sewing_price || 0}
                          onChange={e => setAdditionalItems(prev => prev.map((it, i) => i === idx ? { ...it, sewing_price: Number(e.target.value) } : it))} />
                        <Input label="Precio Venta" type="number" value={item.sale_price || 0}
                          onChange={e => setAdditionalItems(prev => prev.map((it, i) => i === idx ? { ...it, sale_price: Number(e.target.value) } : it))} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FOOTER BUTTONS ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-border-custom">
          <button
            onClick={step === 1 ? onCancel : () => setStep(1)}
            className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-foreground-muted hover:text-foreground-main transition-colors"
          >
            {step === 1 ? "Cancelar" : "Volver"}
          </button>
          <button
            onClick={step === 1 ? generateItems : handleSubmit}
            disabled={step === 1 && ((!selectedClient && !isCreatingClient) || !hasSelectedQty)}
            className="bg-accent text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-accent/20 disabled:opacity-50 disabled:hover:scale-100 active:scale-95"
          >
            {step === 2 ? "Finalizar" : "Siguiente"}
          </button>
        </div>
      </div>
    </Modal>
  );
}