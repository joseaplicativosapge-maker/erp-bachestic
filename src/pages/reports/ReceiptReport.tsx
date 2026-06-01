import { format } from "date-fns";
import QRCode from "react-qr-code";
import type { Order, Payment } from "@/src/lib/types";

interface ReceiptReportProps {
  order:   Order;
  payment: Payment;
}

export function ReceiptReport({ order, payment }: ReceiptReportProps) {
  const orderUrl = `http://localhost:3000/?order=${order.order_number}`;

  const groupedItems =
    order.items && order.items.length > 0
      ? Object.values(
          order.items.reduce((acc, item) => {
            const quantity  = item.quantity  || 1;
            const unitPrice = item.sale_price || 0;
            const key       = `${item.garment_type}-${unitPrice}`;

            if (!acc[key]) {
              acc[key] = { garment_type: item.garment_type, quantity: 0, unitPrice, total: 0 };
            }

            acc[key].quantity += quantity;
            acc[key].total    += quantity * unitPrice;

            return acc;
          }, {} as Record<string, any>)
        )
      : [];

  return (
    <div
      id="receipt-content"
      className="bg-white text-black p-8 font-mono text-[11px] w-[320px] mx-auto border border-black"
    >
      {/* HEADER */}
      <div className="text-center border-b border-dashed border-black pb-4 mb-4">
        <img src="/logo-bachestic.png" alt="Logo" className="mx-auto h-28 object-contain mb-2" />
        <p className="text-[10px] mt-2">NIT: 123.456.789-0</p>
        <p className="text-[10px]">Calle 123 #45-67</p>
        <p className="text-[10px]">Tel: +57 300 123 4567</p>
      </div>

      {/* INFO */}
      <div className="space-y-2 mb-4">
        {[
          { label: "RECIBO:",    value: `RC-${payment.id}`                                                          },
          { label: "FECHA:",     value: format(new Date(payment.created_at || new Date()), "dd/MM/yyyy HH:mm")      },
          { label: "ORDEN:",     value: order.order_number                                                          },
          { label: "DOCUMENTO:", value: `${order.client_doc_type} - ${order.client_doc}`.toUpperCase()             },
          { label: "CLIENTE:",   value: order.client_name?.toUpperCase()                                            },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between">
            <span className="font-bold">{label}</span>
            <span className={label === "RECIBO:" ? "font-black" : ""}>{value}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black my-2" />

      {/* DETALLE */}
      {groupedItems.length > 0 && (
        <div className="mb-4 text-[10px]">
          <p className="font-bold text-center">DETALLE</p>
          <div className="border-t border-dashed border-black my-2" />
          <div className="space-y-2">
            {groupedItems.map((item, index) => (
              <div key={index} className="border-b border-dashed border-black pb-2">
                <div className="font-bold uppercase">
                  {item.garment_type} x <span>{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OBS */}
      {payment.notes && (
        <div className="mb-4">
          <p className="text-[10px] font-bold">OBS:</p>
          <p className="text-[10px] italic">{payment.notes}</p>
        </div>
      )}

      {/* QR */}
      <div className="text-center mt-6">
        <p className="text-[10px] uppercase mb-2">Escanear para consultar pedido</p>
        <div className="bg-white p-2 inline-block border border-black">
          <QRCode value={orderUrl} size={90} />
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center mt-3 text-[10px]">
        <p className="font-bold">¡Gracias por su compra!</p>
        <p className="opacity-60">No es factura legal</p>
      </div>
    </div>
  );
}