import * as XLSX from "xlsx";
import { toast } from "sonner";
import type { Order } from "../../lib/types";

interface Assignment {
  employee_id:       number;
  employee_name?:    string;
  department:        string;
  notes?:            string;
  garment_count?:    number;
  duration_minutes?: number;
  created_at?:       string;
  completed_at?:     string;
}

interface ReportRow {
  order_number:     string;
  client_name:      string;
  team_name:        string;
  status:           string;
  employee_name:    string;
  department:       string;
  garment_type:     string;
  task_label:       string;
  garment_count:    number;
  started_at:       string;
  completed_at:     string;
  duration_minutes: number | null;
  duration_text:    string;
}

interface EmployeeSummary {
  name:      string;
  tasks:     number;
  qty:       number;
  durations: number[];
}


// ─── Constants ────────────────────────────────────────────────────────────────

const HEADERS = [
  "Orden", "Cliente", "Equipo", "Estado Orden",
  "Responsable", "Departamento", "Tipo Prenda", "Tarea",
  "Cantidad", "Inicio", "Fin", "Duración (min)", "Duración",
] as const;

const COL_WIDTHS = [
  { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 18 },
  { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 22 },
  { wch: 10 },
  { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
];

const SUMMARY_COL_WIDTHS = [
  { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 22 },
];

const DURATION_SLOW_THRESHOLD = 480;
const DURATION_OK_THRESHOLD   = 240;


// ─── Styles ───────────────────────────────────────────────────────────────────

const BORDER = {
  top:    { style: "thin", color: { rgb: "444444" } },
  bottom: { style: "thin", color: { rgb: "444444" } },
  left:   { style: "thin", color: { rgb: "444444" } },
  right:  { style: "thin", color: { rgb: "444444" } },
} as const;

const CELL_BORDER = {
  top:    { style: "thin", color: { rgb: "DDDDDD" } },
  bottom: { style: "thin", color: { rgb: "DDDDDD" } },
  left:   { style: "thin", color: { rgb: "DDDDDD" } },
  right:  { style: "thin", color: { rgb: "DDDDDD" } },
} as const;

const headerStyle = {
  font:      { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
  fill:      { fgColor: { rgb: "1A1A2E" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border:    BORDER,
};

const cellStyle = {
  font:      { sz: 10 },
  alignment: { vertical: "center", wrapText: true },
  border:    CELL_BORDER,
};

const slowStyle = {
  ...cellStyle,
  fill: { fgColor: { rgb: "FEE2E2" } },
  font: { color: { rgb: "B91C1C" }, sz: 10 },
};

const okStyle = {
  ...cellStyle,
  fill: { fgColor: { rgb: "D1FAE5" } },
  font: { color: { rgb: "065F46" }, sz: 10 },
};


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "En progreso";
  if (minutes < 60)   return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CO");
}

function getDurationStyle(minutes: number | null) {
  if (minutes == null)                     return cellStyle;
  if (minutes > DURATION_SLOW_THRESHOLD)   return slowStyle;
  if (minutes < DURATION_OK_THRESHOLD)     return okStyle;
  return cellStyle;
}

function buildReportRow(order: Order, assignment: Assignment): ReportRow {
  const typeMatch   = (assignment.notes || "").match(/^\[(.+?)\]/);
  const garmentType = typeMatch ? typeMatch[1] : "—";
  const taskLabel   = (assignment.notes || "")
    .replace(/^\[.+?\]\s*/, "")
    .split(" — ")[0]
    .trim() || assignment.department;

  return {
    order_number:     order.order_number,
    client_name:      order.client_name,
    team_name:        order.team_name || "—",
    status:           order.status,
    employee_name:    assignment.employee_name || `Emp #${assignment.employee_id}`,
    department:       assignment.department,
    garment_type:     garmentType,
    task_label:       taskLabel,
    garment_count:    assignment.garment_count  ?? 0,
    started_at:       formatDate(assignment.created_at),
    completed_at:     formatDate(assignment.completed_at),
    duration_minutes: assignment.duration_minutes ?? null,
    duration_text:    formatDuration(assignment.duration_minutes),
  };
}

function rowToValues(row: ReportRow): (string | number)[] {
  return [
    row.order_number, row.client_name, row.team_name,  row.status,
    row.employee_name, row.department, row.garment_type, row.task_label,
    row.garment_count,
    row.started_at, row.completed_at, row.duration_minutes ?? "", row.duration_text,
  ];
}


// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildDetailSheet(rows: ReportRow[]): object {
  const ws: Record<string, unknown> = {};

  HEADERS.forEach((h, ci) => {
    ws[XLSX.utils.encode_cell({ r: 0, c: ci })] = { v: h, t: "s", s: headerStyle };
  });

  rows.forEach((row, ri) => {
    rowToValues(row).forEach((v, ci) => {
      const style = ci === 11 ? getDurationStyle(row.duration_minutes) : cellStyle;
      ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })] = {
        v,
        t: typeof v === "number" ? "n" : "s",
        s: style,
      };
    });
  });

  ws["!ref"]  = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: HEADERS.length - 1 },
  });
  ws["!cols"] = COL_WIDTHS;
  ws["!rows"] = [{ hpt: 32 }];

  return ws;
}

function buildSummarySheet(rows: ReportRow[]): object {
  const byEmployee: Record<string, EmployeeSummary> = {};

  rows.forEach(row => {
    if (!byEmployee[row.employee_name]) {
      byEmployee[row.employee_name] = {
        name:      row.employee_name,
        tasks:     0,
        qty:       0,
        durations: [],
      };
    }
    const emp = byEmployee[row.employee_name];
    emp.tasks += 1;
    emp.qty   += row.garment_count;
    if (row.duration_minutes != null) emp.durations.push(row.duration_minutes);
  });

  const summaryData = [
    ["Responsable", "Tareas", "Prendas", "Prom. Duración (min)", "Máx. Duración (min)"],
    ...Object.values(byEmployee).map(emp => {
      const avg = emp.durations.length
        ? Math.round(emp.durations.reduce((a, b) => a + b, 0) / emp.durations.length)
        : "";
      const max = emp.durations.length ? Math.max(...emp.durations) : "";
      return [emp.name, emp.tasks, emp.qty, avg, max];
    }),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2["!cols"] = SUMMARY_COL_WIDTHS;

  (["A1", "B1", "C1", "D1", "E1"] as const).forEach(cell => {
    if (ws2[cell]) ws2[cell].s = headerStyle;
  });

  return ws2;
}


// ─── Main export ─────────────────────────────────────────────────────────────

export async function exportTimesReport(orders: Order[]): Promise<void> {
  if (!orders.length) {
    toast.error("No hay órdenes para exportar");
    return;
  }

  toast.info("Generando reporte…");

  const allRows: ReportRow[] = [];

  await Promise.all(
    orders.map(async order => {
      try {
        const assignments: Assignment[] = await fetch(
          `/api/orders/${order.id}/assignments`
        ).then(r => r.json());

        assignments.forEach(assignment => {
          allRows.push(buildReportRow(order, assignment));
        });
      } catch {
        // Skip orders with failed assignment fetches
      }
    })
  );

  if (!allRows.length) {
    toast.error("Las órdenes seleccionadas no tienen asignaciones registradas");
    return;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildDetailSheet(allRows),  "Tiempos por Actividad");
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(allRows), "Resumen por Responsable");

  const dateStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `Reporte_Tiempos_${dateStr}.xlsx`);
  toast.success("Reporte descargado");
}