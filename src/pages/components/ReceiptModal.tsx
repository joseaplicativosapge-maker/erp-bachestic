import { Printer } from "lucide-react";
import Modal from "@/src/pages/components/Modal";
import { ReceiptReport } from "@/src/pages/reports/ReceiptReport";
import type { Order, Payment } from "@/src/lib/types";

interface ReceiptModalProps {
  order:   Order;
  payment: Payment;
  onClose: () => void;
}

export function ReceiptModal({ order, payment, onClose }: ReceiptModalProps) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Recibo de Pago" maxWidth="max-w-5xl">
      <div className="space-y-8">
        <div className="max-h-[70vh] overflow-y-auto bg-gray-100 p-8 border border-border-custom">
          <ReceiptReport order={order} payment={payment} />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-surface-hover text-foreground-main py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-surface-hover/80 transition-all border border-border-custom"
          >
            <Printer size={20} /> Imprimir Recibo
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-accent/20"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}