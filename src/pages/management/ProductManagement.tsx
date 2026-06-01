import { useState, useEffect } from "react";
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Package, Edit2, Trash2, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { api } from "../../services/api";
import { Input } from "../components/Input";
import Card from "../components/Card";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { ErrorMessage } from "../components/ErrorMessage";
import type { Product } from "../../lib/types";


// ─── Constants ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 9;

const EMPTY_FORM = {
  code: "",
  name: "",
  category: "Uniforme",
  sale_price: 0,
  sewing_cost: 0,
  active: true,
  price_filetes: 0,
  price_despuntes: 0,
  price_collarin: 0,
  price_dobladillo_remate: 0,
  price_filete_p: 0,
  price_despuntes_p: 0,
  price_caucho: 0,
  price_sentar_caucho: 0,
  price_collarin_p: 0,
  price_remate: 0,
};

const EMPTY_ERRORS = { code: "", name: "", confeccion: "" };

const CAMISETA_FIELDS = [
  { key: "price_filetes",          label: "Filetes"             },
  { key: "price_despuntes",        label: "Despuntes"           },
  { key: "price_collarin",         label: "Collarín"            },
  { key: "price_dobladillo_remate",label: "Dobladillo y Remate" },
] as const;

const PANTALONETA_FIELDS = [
  { key: "price_filete_p",    label: "Filete"        },
  { key: "price_despuntes_p", label: "Despuntes"     },
  { key: "price_caucho",      label: "Caucho"        },
  { key: "price_sentar_caucho",label:"Sentar Caucho" },
  { key: "price_collarin_p",  label: "Collarín"      },
  { key: "price_remate",      label: "Remate"        },
] as const;

type FormData = typeof EMPTY_FORM;
type CamisetaKey = typeof CAMISETA_FIELDS[number]["key"];
type PantalonetaKey = typeof PANTALONETA_FIELDS[number]["key"];
type PriceKey = CamisetaKey | PantalonetaKey;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sumFields(form: FormData, fields: readonly { key: PriceKey }[]): number {
  return fields.reduce((acc, { key }) => acc + Number(form[key] || 0), 0);
}


// ─── Component ───────────────────────────────────────────────────────────────

export function ProductManagement() {
  const [products,           setProducts]           = useState<Product[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [showAdd,            setShowAdd]            = useState(false);
  const [activeTab,          setActiveTab]          = useState<"active" | "inactive">("active");
  const [searchTerm,         setSearchTerm]         = useState("");
  const [showConfirmToggle,  setShowConfirmToggle]  = useState(false);
  const [productToToggle,    setProductToToggle]    = useState<Product | null>(null);
  const [editingProduct,     setEditingProduct]     = useState<Product | null>(null);
  const [currentPageActive,  setCurrentPageActive]  = useState(1);
  const [currentPageInactive,setCurrentPageInactive]= useState(1);
  const [newProduct,         setNewProduct]         = useState<FormData>(EMPTY_FORM);
  const [errors,             setErrors]             = useState(EMPTY_ERRORS);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    if (activeTab === "active") setCurrentPageActive(1);
    else setCurrentPageInactive(1);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPageActive(1);
    setCurrentPageInactive(1);
  }, [searchTerm]);

  // Recalculate sewing_cost whenever any price field changes
  useEffect(() => {
    const total =
      sumFields(newProduct, CAMISETA_FIELDS) +
      sumFields(newProduct, PANTALONETA_FIELDS);

    if (newProduct.sewing_cost !== total) {
      setNewProduct(prev => ({ ...prev, sewing_cost: total }));
    }
  }, [
    newProduct.price_filetes,
    newProduct.price_despuntes,
    newProduct.price_collarin,
    newProduct.price_dobladillo_remate,
    newProduct.price_filete_p,
    newProduct.price_despuntes_p,
    newProduct.price_caucho,
    newProduct.price_sentar_caucho,
    newProduct.price_collarin_p,
    newProduct.price_remate,
  ]);

  // ── Data ──────────────────────────────────────────────────────────────────

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts(true);
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Form ──────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setNewProduct(EMPTY_FORM);
    setErrors(EMPTY_ERRORS);
  };

  const validateForm = (): boolean => {
    const next = { ...EMPTY_ERRORS };

    if (!newProduct.code.trim()) next.code = "Campo obligatorio";
    if (!newProduct.name.trim()) next.name = "Campo obligatorio";

    const codeExists = products.some(
      p =>
        (p as any).code?.toLowerCase().trim() === newProduct.code.toLowerCase().trim() &&
        p.id !== editingProduct?.id
    );
    if (codeExists) next.code = "Código ya registrado";

    const nameExists = products.some(
      p =>
        p.name?.toLowerCase().trim() === newProduct.name.toLowerCase().trim() &&
        p.id !== editingProduct?.id
    );
    if (nameExists) next.name = "Producto ya existe";

    const allPriceFields: readonly { key: PriceKey }[] = [
      ...CAMISETA_FIELDS,
      ...PANTALONETA_FIELDS,
    ];
    if (allPriceFields.some(({ key }) => Number(newProduct[key]) <= 0)) {
      next.confeccion = "Todos los costos de confección deben ser mayores a 0";
    }

    setErrors(next);
    return !next.code && !next.name && !next.confeccion;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, newProduct);
        toast.success("Producto actualizado correctamente");
      } else {
        await api.createProduct(newProduct);
        toast.success("Producto creado correctamente");
      }

      setShowAdd(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar producto");
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      code:                    (product as any).code                    || "",
      name:                    product.name,
      category:                product.category,
      sale_price:              product.sale_price,
      sewing_cost:             product.sewing_cost,
      active:                  product.active,
      price_filetes:           (product as any).price_filetes           || 0,
      price_despuntes:         (product as any).price_despuntes         || 0,
      price_collarin:          (product as any).price_collarin          || 0,
      price_dobladillo_remate: (product as any).price_dobladillo_remate || 0,
      price_filete_p:          (product as any).price_filete_p          || 0,
      price_despuntes_p:       (product as any).price_despuntes_p       || 0,
      price_caucho:            (product as any).price_caucho            || 0,
      price_sentar_caucho:     (product as any).price_sentar_caucho     || 0,
      price_collarin_p:        (product as any).price_collarin_p        || 0,
      price_remate:            (product as any).price_remate            || 0,
    });
    setErrors(EMPTY_ERRORS);
    setShowAdd(true);
  };

  const confirmToggleActive = (product: Product) => {
    setProductToToggle(product);
    setShowConfirmToggle(true);
  };

  const handleToggleActive = async () => {
    if (!productToToggle) return;
    try {
      await api.updateProduct(productToToggle.id, {
        ...productToToggle,
        active: !productToToggle.active,
      });
      toast.success(
        `Producto ${productToToggle.active ? "desactivado" : "activado"} correctamente`
      );
      setShowConfirmToggle(false);
      setProductToToggle(null);
      loadProducts();
    } catch (error) {
      console.error(error);
      toast.error("Error al cambiar estado");
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Cargando Productos" />;

  const term = searchTerm.toLowerCase().trim();

  const filteredProducts = products.filter(p => {
    const matchesTab    = activeTab === "active" ? p.active : !p.active;
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      ((p as any).code || "").toLowerCase().includes(term);
    return matchesTab && matchesSearch;
  });

  const currentPage = activeTab === "active" ? currentPageActive : currentPageInactive;
  const totalPages  = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginated   = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const changePage = (page: number) => {
    if (activeTab === "active") setCurrentPageActive(page);
    else setCurrentPageInactive(page);
  };

  const camisetaTotal    = sumFields(newProduct, CAMISETA_FIELDS);
  const pantalonetaTotal = sumFields(newProduct, PANTALONETA_FIELDS);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* CABECERA */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-end justify-between gap-6">

  {/* FILTROS */}
  <div className="w-full rounded-[32px] border border-border-custom bg-surface/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">

    {/* TOP BAR */}
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5">

      {/* LEFT */}
      <div className="flex items-center gap-4 flex-wrap">

        {/* TABS */}
        <div className="flex bg-surface-hover border border-border-custom rounded-2xl p-1">
          {(["active", "inactive"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "text-foreground-muted hover:text-foreground-main"
              )}
            >
              {tab === "active" ? "Activos" : "Desactivados"}
            </button>
          ))}
        </div>

        {/* TOTAL */}
        <div className="px-5 py-3 rounded-2xl bg-accent/10 border border-accent/10 text-accent text-[10px] font-black uppercase tracking-[0.18em] whitespace-nowrap">
          {filteredProducts.length}{" "}
          {filteredProducts.length === 1 ? "producto" : "productos"}
        </div>

      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* TOGGLE FILTROS */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "h-14 px-6 rounded-2xl border border-border-custom bg-surface-hover text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all",
            showFilters
              ? "border-accent text-accent"
              : "text-foreground-muted hover:text-foreground-main"
          )}
        >
          <Search size={18} />

          {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
        </button>

        {/* NUEVO PRODUCTO */}
        <button
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setShowAdd(true);
          }}
          className="h-14 px-8 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:scale-[1.03] transition-all shadow-xl shadow-accent/20 whitespace-nowrap"
        >
          <Plus size={20} />
          Nuevo Producto
        </button>

      </div>
    </div>

    {/* ACCORDION */}
    <AnimatePresence initial={false}>
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden border-t border-border-custom"
        >

          {/* FILTROS */}
          <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* BUSCADOR */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
              />

              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-14 rounded-2xl border border-border-custom bg-surface-hover pl-12 pr-12 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent/30"
              />

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-accent transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

          </div>

        </motion.div>
      )}
    </AnimatePresence>

  </div>
</div>

      {/* GRID */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            searchTerm
              ? `Sin resultados para "${searchTerm}"`
              : activeTab === "inactive"
                ? "No hay productos desactivados"
                : "No hay productos activos"
          }
          message={
            searchTerm
              ? "Intenta con otro nombre o código."
              : activeTab === "inactive"
                ? "No se encontraron productos desactivados."
                : "Aún no se han registrado productos."
          }
          actionLabel={!searchTerm && activeTab === "active" ? "Crear Nuevo Producto" : undefined}
          onAction={
            !searchTerm && activeTab === "active"
              ? () => { setEditingProduct(null); resetForm(); setShowAdd(true); }
              : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginated.map(product => (
              <Card
                key={product.id}
                className={cn(
                  "group hover:border-accent/30 transition-all relative overflow-hidden",
                  !product.active && "opacity-60 grayscale-[0.5]"
                )}
              >
                {!product.active && (
                  <div className="absolute top-0 right-0 bg-accent text-white text-[8px] font-black px-3 py-1.5 uppercase tracking-widest rounded-bl-xl">
                    Inactivo
                  </div>
                )}

                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <Package size={24} />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-3 bg-surface-hover hover:bg-accent/10 rounded-xl text-foreground-muted hover:text-foreground-main transition-all"
                      title="Editar producto"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => confirmToggleActive(product)}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        product.active
                          ? "bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent"
                          : "bg-accent text-white"
                      )}
                      title={product.active ? "Desactivar producto" : "Activar producto"}
                    >
                      {product.active ? <Trash2 size={18} /> : <RefreshCw size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest">
                      {(product as any).code}
                    </p>
                    <h4 className="text-xl font-black text-foreground-main tracking-tight uppercase">
                      {product.name}
                    </h4>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                      product.category === "Uniforme"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-purple-500/10 text-purple-400"
                    )}>
                      {product.category || "Uniforme"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-custom">
                    <div>
                      <p className="text-[9px] font-black text-foreground-muted uppercase tracking-widest mb-1">
                        Costo Costura
                      </p>
                      <p className="text-lg font-black text-foreground-main">
                        ${(product.sewing_cost || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
              <button
                onClick={() => changePage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-border-custom bg-surface-hover text-sm font-black uppercase tracking-widest disabled:opacity-40"
              >
                Anterior
              </button>
              <div className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-black">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => changePage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-border-custom bg-surface-hover text-sm font-black uppercase tracking-widest disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* MODAL CONFIRMACIÓN TOGGLE */}
      <Modal
        isOpen={showConfirmToggle}
        onClose={() => { setShowConfirmToggle(false); setProductToToggle(null); }}
        title={productToToggle?.active ? "Desactivar Producto" : "Activar Producto"}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <p className="text-sm font-bold text-foreground-muted">
            ¿Estás seguro de que deseas{" "}
            {productToToggle?.active ? "desactivar" : "activar"} el producto{" "}
            <span className="font-black text-foreground-main">
              {productToToggle?.name}
            </span>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowConfirmToggle(false); setProductToToggle(null); }}
              className="px-6 py-3 rounded-2xl border border-border-custom text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:bg-surface-hover transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleToggleActive}
              className="px-6 py-3 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-105 transition-all"
            >
              {productToToggle?.active ? "Desactivar" : "Activar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL CREAR / EDITAR */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setEditingProduct(null); resetForm(); }}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
      >
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* CÓDIGO */}
          <div>
            <Input
              label="Código"
              value={newProduct.code}
              onChange={e => {
                setNewProduct({ ...newProduct, code: e.target.value });
                setErrors(prev => ({ ...prev, code: "" }));
              }}
            />
            {errors.code && <ErrorMessage message={errors.code} />}
          </div>

          {/* NOMBRE */}
          <div>
            <Input
              label="Nombre"
              value={newProduct.name}
              onChange={e => {
                setNewProduct({ ...newProduct, name: e.target.value });
                setErrors(prev => ({ ...prev, name: "" }));
              }}
            />
            {errors.name && <ErrorMessage message={errors.name} />}
          </div>
          
          {/* CATEGORÍA */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
            Categoría del Producto
          </p>
          <div className="flex flex-wrap gap-2">
            {["Uniforme", "Chaqueta", "Medias", "Camiseta", "Otro"].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setNewProduct(p => ({ ...p, category: cat }))}
                className={cn(
                  "px-4 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border",
                  newProduct.category === cat
                    ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                    : "bg-surface-hover text-foreground-muted border-border-custom hover:text-foreground-main"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-foreground-muted/60 font-bold uppercase tracking-widest">
            "Uniforme" aparece en cantidades al crear órdenes. Las demás como productos adicionales.
          </p>
        </div>

          {/* COSTOS — CAMISETA */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase">
              Costos de Confección — Camiseta
            </p>
            {CAMISETA_FIELDS.map(({ key, label }) => (
              <Input
                key={key}
                label={label}
                type="number"
                value={newProduct[key]}
                onChange={e =>
                  setNewProduct({ ...newProduct, [key]: Number(e.target.value) })
                }
              />
            ))}
            <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                Total Costura Camiseta
              </p>
              <p className="text-2xl font-black text-foreground-main">
                ${camisetaTotal.toLocaleString()}
              </p>
            </div>
          </div>

          {/* COSTOS — PANTALONETA */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase">
              Costos de Confección — Pantaloneta
            </p>
            {PANTALONETA_FIELDS.map(({ key, label }) => (
              <Input
                key={key}
                label={label}
                type="number"
                value={newProduct[key]}
                onChange={e =>
                  setNewProduct({ ...newProduct, [key]: Number(e.target.value) })
                }
              />
            ))}
            <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                Total Costura Pantaloneta
              </p>
              <p className="text-2xl font-black text-foreground-main">
                ${pantalonetaTotal.toLocaleString()}
              </p>
            </div>
          </div>

          {/* TOTAL FINAL */}
          <div className="bg-surface-hover rounded-3xl p-6 border border-border-custom">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-2">
              Costo Total de Confección
            </p>
            <p className="text-4xl font-black text-accent">
              ${newProduct.sewing_cost.toLocaleString()}
            </p>
          </div>

          {errors.confeccion && <ErrorMessage message={errors.confeccion} />}

          <button
            type="submit"
            className="w-full bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all mt-4"
          >
            {editingProduct ? "Actualizar Producto" : "Guardar Producto"}
          </button>
        </form>
      </Modal>
    </div>
  );
}