import { useState, useEffect } from "react";
import {
  Shirt,
  Users,
  Download,
  RefreshCw,
  ChevronDown,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cn } from "@/src/lib/utils";
import { api } from "../../services/api";
import LoadingState  from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import Card from "../components/Card";
import type { Assignment } from "../../lib/types";


// ─── Constants ────────────────────────────────────────────────────────────────

const CAM_TASKS = [
  { key: "filetes",           label: "Filetes"            },
  { key: "despuntes",         label: "Despuntes"          },
  { key: "collarin",          label: "Collarín"           },
  { key: "dobladillo_remate", label: "Dobladillo y remate"},
] as const;

const PANT_TASKS = [
  { key: "filete_p",      label: "Filete"        },
  { key: "despuntes_p",   label: "Despuntes"     },
  { key: "caucho",        label: "Caucho"        },
  { key: "sentar_caucho", label: "Sentar caucho" },
  { key: "collarin_p",    label: "Collarín"      },
  { key: "remate",        label: "Remate"        },
] as const;

const ALL_TASKS = [...CAM_TASKS, ...PANT_TASKS];


// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedAssignment extends Assignment {
  garment_type: string;
  task_label:   string;
  task_key:     string;
}

interface EmpBucket {
  name:       string;
  total_qty:  number;
  total_cost: number;
  cam:        Record<string, { qty: number; cost: number }>;
  pant:       Record<string, { qty: number; cost: number }>;
}


// ─── Props ────────────────────────────────────────────────────────────────────

interface ConfectionReportProps {
  reportKey?: string;
}


// ─── Component ────────────────────────────────────────────────────────────────

export function ConfectionReport({ reportKey }: ConfectionReportProps) {

  // ── State ─────────────────────────────────────────────────────────────────

  const [data,        setData]        = useState<ParsedAssignment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [empFilter,   setEmpFilter]   = useState("");
  const [typeFilter,  setTypeFilter]  = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [tab,         setTab]         = useState<"detail" | "summary">("detail");
  const [isExporting, setIsExporting] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const assignments    = await api.getAllAssignments();
        const confeccionOnly = assignments.filter((a: Assignment) => a.department === "Confección");
        const parsed: ParsedAssignment[] = confeccionOnly.map((a: Assignment) => {
          const notesRaw   = a.notes || "";
          const typeMatch  = notesRaw.match(/^\[(.+?)\]/);
          const garment_type = typeMatch ? typeMatch[1] : "Camiseta";
          const rest       = notesRaw.replace(/^\[.+?\]\s*/, "").split(" — ")[0].trim();
          const found      = ALL_TASKS.find(t => t.label.toLowerCase() === rest.toLowerCase());
          return {
            ...a,
            garment_type,
            task_label: rest,
            task_key:   found?.key || rest.toLowerCase().replace(/\s/g, "_"),
          };
        });
        setData(parsed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reportKey]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const employees = [...new Set(data.map(r => r.employee_name).filter(Boolean))].sort() as string[];

  const filtered = data.filter(r =>
    (!empFilter   || r.employee_name === empFilter) &&
    (!typeFilter  || r.garment_type  === typeFilter) &&
    (!orderFilter || (r.order_number || "").toLowerCase().includes(orderFilter.toLowerCase()))
  );

  const totalQty  = filtered.reduce((s, r) => s + (r.garment_count  || 0), 0);
  const totalCost = filtered.reduce((s, r) => s + (r.garment_count  || 0) * (r.price_per_unit || 0), 0);
  const camQty    = filtered.filter(r => r.garment_type === "Camiseta").reduce((s, r) => s + (r.garment_count || 0), 0);
  const pantQty   = filtered.filter(r => r.garment_type === "Pantaloneta").reduce((s, r) => s + (r.garment_count || 0), 0);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const buildEmpMap = (rows: ParsedAssignment[]): Record<string, EmpBucket> => {
    const byEmp: Record<string, EmpBucket> = {};
    rows.forEach(r => {
      const k = r.employee_name || `Emp #${r.employee_id}`;
      if (!byEmp[k]) byEmp[k] = { name: k, total_qty: 0, total_cost: 0, cam: {}, pant: {} };
      const bucket = r.garment_type === "Camiseta" ? byEmp[k].cam : byEmp[k].pant;
      const label  = r.task_label || "";
      if (!bucket[label]) bucket[label] = { qty: 0, cost: 0 };
      bucket[label].qty  += r.garment_count || 0;
      bucket[label].cost += (r.garment_count || 0) * (r.price_per_unit || 0);
      byEmp[k].total_qty  += r.garment_count || 0;
      byEmp[k].total_cost += (r.garment_count || 0) * (r.price_per_unit || 0);
    });
    return byEmp;
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const exportToExcel = () => {
    if (!filtered.length) { toast.error("No hay registros para exportar"); return; }
    setIsExporting(true);

    const headerStyle = {
      font:      { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      fill:      { fgColor: { rgb: "1A1A2E" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border:    { top: { style: "thin", color: { rgb: "444444" } }, bottom: { style: "thin", color: { rgb: "444444" } }, left: { style: "thin", color: { rgb: "444444" } }, right: { style: "thin", color: { rgb: "444444" } } },
    };
    const cellStyle = {
      font:      { sz: 10 },
      alignment: { vertical: "center", wrapText: true },
      border:    { top: { style: "thin", color: { rgb: "DDDDDD" } }, bottom: { style: "thin", color: { rgb: "DDDDDD" } }, left: { style: "thin", color: { rgb: "DDDDDD" } }, right: { style: "thin", color: { rgb: "DDDDDD" } } },
    };
    const accentStyle = { ...cellStyle, font: { bold: true, color: { rgb: "E11D48" }, sz: 10 } };
    const blueStyle   = { ...cellStyle, font: { bold: true, color: { rgb: "3B82F6" }, sz: 10 } };
    const purpleStyle = { ...cellStyle, font: { bold: true, color: { rgb: "9333EA" }, sz: 10 } };
    const totalStyle  = { ...cellStyle, font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "F1F5F9" } } };

    // Hoja 1: Detalle por tarea
    const ws1: Record<string, unknown> = {};
    const headers1 = ["Orden", "Responsable", "Tipo Prenda", "Tarea", "Cantidad", "$ Unit.", "Subtotal"];
    const rows1    = filtered.map(r => [
      r.order_number || `#${r.order_id}`,
      r.employee_name || `Emp #${r.employee_id}`,
      r.garment_type,
      r.task_label,
      r.garment_count || 0,
      r.price_per_unit || 0,
      (r.garment_count || 0) * (r.price_per_unit || 0),
    ]);

    headers1.forEach((h, ci) => {
      ws1[XLSX.utils.encode_cell({ r: 0, c: ci })] = { v: h, t: "s", s: headerStyle };
    });
    rows1.forEach((row, ri) => {
      row.forEach((v, ci) => {
        let s: unknown = cellStyle;
        if (ci === 2) s = v === "Camiseta" ? blueStyle : purpleStyle;
        if (ci === 6) s = accentStyle;
        ws1[XLSX.utils.encode_cell({ r: ri + 1, c: ci })] = { v, t: typeof v === "number" ? "n" : "s", s };
      });
    });
    const totalRow = rows1.length + 1;
    ["TOTAL", "", "", "", totalQty, "", totalCost].forEach((v, ci) => {
      ws1[XLSX.utils.encode_cell({ r: totalRow, c: ci })] = { v, t: typeof v === "number" ? "n" : "s", s: totalStyle };
    });
    ws1["!ref"]  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRow, c: 6 } });
    ws1["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 14 }];
    ws1["!rows"] = [{ hpt: 28 }];

    // Hoja 2: Resumen por responsable
    const byEmp = buildEmpMap(filtered);
    const summaryRows: (string | number)[][] = [["Responsable", "Tipo", "Tarea", "Cantidad", "Costo"]];
    Object.values(byEmp).sort((a, b) => b.total_cost - a.total_cost).forEach(emp => {
      Object.entries(emp.cam).forEach(([label, v])  => summaryRows.push([emp.name, "Camiseta",    label, v.qty, v.cost]));
      Object.entries(emp.pant).forEach(([label, v]) => summaryRows.push([emp.name, "Pantaloneta", label, v.qty, v.cost]));
      summaryRows.push(["SUBTOTAL " + emp.name, "", "", emp.total_qty, emp.total_cost]);
    });

    const ws2: Record<string, unknown> = {};
    summaryRows.forEach((row, ri) => {
      const isHeader   = ri === 0;
      const isSubtotal = typeof row[0] === "string" && row[0].startsWith("SUBTOTAL");
      row.forEach((v, ci) => {
        let s: unknown = isHeader ? headerStyle : isSubtotal ? totalStyle : cellStyle;
        if (!isHeader && !isSubtotal && ci === 1) s = v === "Camiseta" ? blueStyle : purpleStyle;
        if (!isHeader && !isSubtotal && ci === 4) s = accentStyle;
        ws2[XLSX.utils.encode_cell({ r: ri, c: ci })] = { v, t: typeof v === "number" ? "n" : "s", s };
      });
    });
    ws2["!ref"]  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: summaryRows.length - 1, c: 4 } });
    ws2["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 14 }];
    ws2["!rows"] = [{ hpt: 28 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Detalle por Tarea");
    XLSX.utils.book_append_sheet(wb, ws2, "Resumen por Responsable");
    XLSX.writeFile(wb, `Reporte_Confeccion_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Reporte exportado");
    setIsExporting(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderDetail = (rows: ParsedAssignment[], tipo: string) => {
    if (!rows.length) return null;
    const totQty  = rows.reduce((s, r) => s + (r.garment_count || 0), 0);
    const totCost = rows.reduce((s, r) => s + (r.garment_count || 0) * (r.price_per_unit || 0), 0);
    return (
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-4 flex items-center gap-2">
          <Shirt size={14} className={tipo === "Camiseta" ? "text-blue-400" : "text-purple-400"} />
          {tipo}
        </p>
        <div className="overflow-x-auto rounded-[24px] border border-border-custom">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-hover text-[9px] uppercase font-black tracking-[0.2em] text-foreground-muted">
                <th className="py-4 px-5">Orden</th>
                <th className="py-4 px-5">Responsable</th>
                <th className="py-4 px-5">Tarea</th>
                <th className="py-4 px-5 text-right">Cant.</th>
                <th className="py-4 px-5 text-right">$ Unit.</th>
                <th className="py-4 px-5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-surface-hover transition-colors">
                  <td className="py-3 px-5 text-[11px] text-foreground-muted">{r.order_number || `#${r.order_id}`}</td>
                  <td className="py-3 px-5 font-bold text-foreground-main text-[11px]">{r.employee_name || `Emp #${r.employee_id}`}</td>
                  <td className="py-3 px-5 text-[11px]">{r.task_label}</td>
                  <td className="py-3 px-5 text-right font-black text-foreground-main">{(r.garment_count || 0).toLocaleString()}</td>
                  <td className="py-3 px-5 text-right text-foreground-muted text-[11px]">${(r.price_per_unit || 0).toLocaleString()}</td>
                  <td className="py-3 px-5 text-right font-black text-foreground-main">${((r.garment_count || 0) * (r.price_per_unit || 0)).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-surface-hover font-black">
                <td colSpan={3} className="py-3 px-5 text-[10px] uppercase tracking-widest">Total {tipo}</td>
                <td className="py-3 px-5 text-right">{totQty.toLocaleString()}</td>
                <td />
                <td className="py-3 px-5 text-right text-accent">${totCost.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const byEmp = buildEmpMap(filtered);
    return Object.values(byEmp).sort((a, b) => b.total_cost - a.total_cost).map((emp, i) => (
      <Card key={i} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
              <Users size={24} />
            </div>
            <div>
              <p className="font-black text-lg text-foreground-main tracking-tight">{emp.name}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Confección</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-2xl text-accent tracking-tighter">${emp.total_cost.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-foreground-muted">{emp.total_qty} prendas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-custom">
          {Object.keys(emp.cam).length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-1.5">
                <Shirt size={12} /> Camiseta
              </p>
              <div className="space-y-2">
                {Object.entries(emp.cam).map(([label, v]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border-custom last:border-0">
                    <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">{label}</span>
                    <div className="text-right">
                      <span className="font-black text-foreground-main text-sm">{v.qty}</span>
                      <span className="text-[10px] text-foreground-muted ml-3">${v.cost.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(emp.pant).length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3 flex items-center gap-1.5">
                <Shirt size={12} /> Pantaloneta
              </p>
              <div className="space-y-2">
                {Object.entries(emp.pant).map(([label, v]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border-custom last:border-0">
                    <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">{label}</span>
                    <div className="text-right">
                      <span className="font-black text-foreground-main text-sm">{v.qty}</span>
                      <span className="text-[10px] text-foreground-muted ml-3">${v.cost.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    ));
  };

  // ── Early return ──────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Cargando reporte de confección" />;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <button
          onClick={exportToExcel}
          disabled={isExporting || filtered.length === 0}
          className="bg-surface-hover text-foreground-main border border-border-custom px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:border-accent/40 hover:text-accent transition-all disabled:opacity-40"
        >
          {isExporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
          Exportar Excel
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Total prendas", value: totalQty.toLocaleString()              },
          { label: "Camisetas",     value: camQty.toLocaleString()                },
          { label: "Pantalonetas",  value: pantQty.toLocaleString()               },
          { label: "Costo total",   value: "$" + totalCost.toLocaleString()       },
        ].map((m, i) => (
          <div key={i} className="bg-surface-hover rounded-[24px] border border-border-custom p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-2">{m.label}</p>
            <p className="text-2xl font-black text-foreground-main tracking-tighter">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-[28px] border border-border-custom bg-surface/80 backdrop-blur-xl">
        <div className="relative">
          <select
            value={empFilter}
            onChange={e => setEmpFilter(e.target.value)}
            className="appearance-none bg-surface border border-border-custom rounded-2xl pl-5 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-foreground-main outline-none cursor-pointer min-w-[180px]"
          >
            <option value="">Todos los responsables</option>
            {employees.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="appearance-none bg-surface border border-border-custom rounded-2xl pl-5 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-foreground-main outline-none cursor-pointer min-w-[160px]"
          >
            <option value="">Ambas prendas</option>
            <option value="Camiseta">Camiseta</option>
            <option value="Pantaloneta">Pantaloneta</option>
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
        </div>

        <div className="relative group flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={16} />
          <input
            type="text"
            placeholder="Buscar orden..."
            value={orderFilter}
            onChange={e => setOrderFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main text-[10px] font-black uppercase tracking-widest"
          />
        </div>

        <div className="ml-auto px-5 py-3 rounded-2xl bg-accent/10 border border-accent/10 text-accent text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
          {filtered.length} registros
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {(["detail", "summary"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
              tab === t
                ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                : "bg-surface-hover text-foreground-muted border-border-custom hover:text-foreground-main"
            )}
          >
            {t === "detail" ? "Detalle por tarea" : "Resumen por responsable"}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === "detail" ? (
        <div>
          {renderDetail(filtered.filter(r => r.garment_type === "Camiseta"),    "Camiseta"   )}
          {renderDetail(filtered.filter(r => r.garment_type === "Pantaloneta"), "Pantaloneta")}
          {filtered.length === 0 && (
            <EmptyState icon={Shirt} title="Sin registros" message="No hay asignaciones de confección para los filtros seleccionados." />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {renderSummary()}
          {filtered.length === 0 && (
            <EmptyState icon={Shirt} title="Sin registros" message="No hay asignaciones de confección para los filtros seleccionados." />
          )}
        </div>
      )}
    </motion.div>
  );
}