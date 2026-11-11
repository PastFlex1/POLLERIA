import React, { useEffect, useState } from 'react';
import { X, Printer, Check, FileText, Utensils } from 'lucide-react';
import {
  InvoiceRecord,
  formatUSD,
  BUSINESS_INFO,
  SRI_PAYMENT_METHODS,
  getIdLabel,
} from '../utils/asaderoLogic';

interface ThermalReceiptModalProps {
  invoice: InvoiceRecord;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  invoice,
  onClose,
}) => {
  const [printMode, setPrintMode] = useState<'cliente' | 'cocina'>('cliente');
  const [printedFeedback, setPrintedFeedback] = useState<string | null>(null);

  // Close the modal with the Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSimulatePrint = (label: string) => {
    setPrintedFeedback(label);
    setTimeout(() => setPrintedFeedback(null), 2200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-700" />
            <h2 id="receipt-modal-title" className="text-sm font-bold text-slate-900">
              Vista Previa del Comprobante (RIDE 80mm)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista del comprobante"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher: Tirilla Cliente vs Comanda Cocina */}
        <div className="flex gap-1 border-b border-slate-200 bg-slate-100 p-2">
          <button
            type="button"
            onClick={() => setPrintMode('cliente')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              printMode === 'cliente'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Factura Cliente</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintMode('cocina')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              printMode === 'cocina'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>Comanda de Cocina</span>
          </button>
        </div>

        {/* Thermal Paper Body */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-5">
          <div className="font-mono-tabular mx-auto w-full max-w-[340px] rounded-sm border border-slate-300 bg-[#FFFDF9] p-5 text-xs leading-relaxed text-slate-900 shadow-sm">
            {printMode === 'cliente' ? (
              <>
                <div className="border-b border-dashed border-slate-400 pb-3 text-center">
                  <p className="text-sm font-bold tracking-tight">
                    {BUSINESS_INFO.legalName}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {BUSINESS_INFO.tradeName}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-700">
                    RUC: {BUSINESS_INFO.ruc}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Dir. Matriz: {BUSINESS_INFO.headOfficeAddress}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Tel: {BUSINESS_INFO.phone}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    OBLIGADO A LLEVAR CONTABILIDAD:{' '}
                    {BUSINESS_INFO.keepsAccounting ? 'SI' : 'NO'}
                  </p>
                </div>

                <div className="border-b border-dashed border-slate-400 py-2.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>FACTURA No.</span>
                    <strong className="text-slate-900">{invoice.folio}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha de Emisión:</span>
                    <span>
                      {invoice.issuedDate} {invoice.createdAt}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ambiente:</span>
                    <span>
                      {BUSINESS_INFO.environment === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Emisión:</span>
                    <span>NORMAL</span>
                  </div>
                  <div className="mt-1">
                    <span className="block">Clave de Acceso / N° Autorización:</span>
                    <span className="block text-[9px] break-all text-slate-700">
                      {invoice.accessKey}
                    </span>
                  </div>
                </div>

                <div className="border-b border-dashed border-slate-400 py-2.5 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <span>Razón Social / Nombres:</span>
                    <span className="truncate text-right font-semibold">
                      {invoice.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {getIdLabel(invoice.customerTaxId)}:
                    </span>
                    <span>{invoice.customerTaxId}</span>
                  </div>
                  {invoice.customerEmail && (
                    <div className="flex justify-between gap-2">
                      <span>Correo:</span>
                      <span className="truncate text-right">
                        {invoice.customerEmail}
                      </span>
                    </div>
                  )}
                  {invoice.customerPhone && (
                    <div className="flex justify-between">
                      <span>Teléfono:</span>
                      <span>{invoice.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span>Servicio:</span>
                    <span className="text-right">{invoice.tableOrAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cajero:</span>
                    <span>{invoice.cashierName}</span>
                  </div>
                  {invoice.status === 'anulada' && (
                    <div className="mt-1.5 border border-red-600 bg-red-50 px-2 py-1 text-center font-bold text-red-700">
                      FACTURA ANULADA ({invoice.cancellationReason || 'Anulación'})
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="border-b border-dashed border-slate-400 py-2.5">
                  <div className="mb-1.5 flex justify-between text-[10px] font-bold text-slate-500">
                    <span>CANT · DESCRIPCIÓN</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="space-y-2">
                    {invoice.lines.map((line) => (
                      <div key={line.lineId} className="text-[11px]">
                        <div className="flex justify-between font-semibold">
                          <span>
                            {line.quantity}x {line.product.name}
                          </span>
                          <span>{formatUSD(line.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>
                            {line.product.plu} · Corte: {line.cutNote}
                          </span>
                          <span>@{formatUSD(line.unitPrice)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tax Breakdown & Totals */}
                <div className="space-y-1 border-b border-dashed border-slate-400 py-2.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>Valor de consumo (IVA incl.):</span>
                    <span>{formatUSD(invoice.totals.grossSubtotal)}</span>
                  </div>
                  {invoice.totals.discountAmount > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Descuento:</span>
                      <span>-{formatUSD(invoice.totals.discountAmount)}</span>
                    </div>
                  )}
                  {invoice.totals.deliveryCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Servicio a domicilio:</span>
                      <span>{formatUSD(invoice.totals.deliveryCharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-dotted border-slate-300 pt-1 text-slate-600">
                    <span>SUBTOTAL 15%:</span>
                    <span>{formatUSD(invoice.totals.netBase)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SUBTOTAL 0%:</span>
                    <span>{formatUSD(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SUBTOTAL SIN IMPUESTOS:</span>
                    <span>{formatUSD(invoice.totals.netBase)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>IVA 15%:</span>
                    <span>{formatUSD(invoice.totals.ivaTax)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold text-slate-900">
                    <span>VALOR TOTAL:</span>
                    <span>{formatUSD(invoice.totals.grandTotal)}</span>
                  </div>
                </div>

                {/* Payment & Change */}
                <div className="space-y-1 py-2.5 text-[11px]">
                  <div>
                    <span className="block">Forma de Pago:</span>
                    <strong className="block text-[10px] uppercase">
                      {SRI_PAYMENT_METHODS[invoice.paymentMethod].code} -{' '}
                      {SRI_PAYMENT_METHODS[invoice.paymentMethod].label}
                    </strong>
                  </div>
                  {invoice.paymentMethod === 'efectivo' && (
                    <>
                      <div className="flex justify-between">
                        <span>Efectivo Recibido:</span>
                        <span>{formatUSD(invoice.cashReceived)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>CAMBIO / VUELTO:</span>
                        <span>{formatUSD(invoice.changeDue)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-2 border-t border-dashed border-slate-400 pt-2.5 text-center text-[10px] text-slate-500">
                  <p>Equivalencia Kardex: {invoice.totals.totalChickenQuarters} cuartos de pollo</p>
                  {BUSINESS_INFO.environment === '1' && (
                    <p className="mt-0.5 font-semibold text-slate-600">
                      Ambiente de PRUEBAS: comprobante sin validez tributaria.
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* Kitchen Comanda Ticket */
              <>
                <div className="border-b-2 border-slate-900 pb-2 text-center">
                  <p className="text-sm font-bold">COMANDA DE COCINA Y ASADOR</p>
                  <p className="text-base font-bold">{invoice.folio}</p>
                  <p className="text-[11px]">{invoice.tableOrAddress}</p>
                </div>
                <div className="border-b border-dashed border-slate-400 py-2 text-[11px]">
                  <p>
                    <strong>Cliente:</strong> {invoice.customerName}
                  </p>
                  <p>
                    <strong>Hora:</strong> {invoice.createdAt} ·{' '}
                    <strong>Presas Pollo:</strong> {invoice.totals.totalChickenQuarters}{' '}
                    cuartos
                  </p>
                </div>
                <div className="space-y-2.5 py-3">
                  {invoice.lines.map((line) => (
                    <div
                      key={line.lineId}
                      className="border-b border-slate-200 pb-2 text-xs"
                    >
                      <p className="font-bold">
                        {line.quantity}x {line.product.name}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-700">
                        → Instrucción Corte: {line.cutNote}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3.5">
          {printedFeedback ? (
            <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white">
              <Check className="h-4 w-4" />
              <span>{printedFeedback}</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  handleSimulatePrint('Factura enviada a la impresora térmica (80mm)')
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Factura (80mm)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
