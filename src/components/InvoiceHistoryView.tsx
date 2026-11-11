import React, { useState } from 'react';
import { Search, Printer, Ban, FileText } from 'lucide-react';
import {
  InvoiceRecord,
  PaymentMethod,
  formatUSD,
  PAYMENT_METHOD_LABELS,
  getIdLabel,
} from '../utils/asaderoLogic';

interface InvoiceHistoryViewProps {
  invoices: InvoiceRecord[];
  onInspectInvoice: (invoice: InvoiceRecord) => void;
  onCancelInvoice: (invoiceId: string, reason: string) => void;
  onGoToBilling: () => void;
}

export const InvoiceHistoryView: React.FC<InvoiceHistoryViewProps> = ({
  invoices,
  onInspectInvoice,
  onCancelInvoice,
  onGoToBilling,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [docFilter, setDocFilter] = useState<'todos' | 'consumidor_final' | 'con_datos' | 'anulada'>('todos');
  const [payFilter, setPayFilter] = useState<'todos' | PaymentMethod>('todos');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Error de digitación en cajero');

  const filtered = invoices.filter((inv) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      inv.folio.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.customerTaxId.toLowerCase().includes(q);

    const matchesDoc =
      docFilter === 'todos'
        ? true
        : docFilter === 'anulada'
        ? inv.status === 'anulada'
        : inv.docType === docFilter && inv.status === 'emitida';

    const matchesPay =
      payFilter === 'todos' ? true : inv.paymentMethod === payFilter;

    return matchesSearch && matchesDoc && matchesPay;
  });

  const activeFiltered = filtered.filter((i) => i.status === 'emitida');
  const totalBase = activeFiltered.reduce((sum, i) => sum + i.totals.netBase, 0);
  const totalTax = activeFiltered.reduce((sum, i) => sum + i.totals.ivaTax, 0);
  const totalFacturado = activeFiltered.reduce(
    (sum, i) => sum + i.totals.grandTotal,
    0
  );

  const handleConfirmCancel = (invoiceId: string) => {
    onCancelInvoice(
      invoiceId,
      cancelReason.trim() || 'Anulación con Nota de Crédito'
    );
    setCancellingId(null);
    setCancelReason('Error de digitación en cajero');
  };

  return (
    <div className="@container space-y-6 text-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            Libro de Facturas y Reportes de Venta
          </h2>
          <p className="text-xs text-zinc-400">
            <span className="font-semibold text-[#F04E3E]">
              {activeFiltered.length} Facturas Activas
            </span>{' '}
            · Facturas electrónicas SRI, Consumidor Final y Notas de Crédito
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToBilling}
          className="rounded-full bg-[#2B2B2E] px-4 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-[#38383C]"
        >
          ← Volver a Facturación
        </button>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4 @3xl:gap-4">
        <div className="rounded-2xl bg-[#2B2B2E] p-4">
          <span className="text-xs text-zinc-400">Facturas Activas</span>
          <p className="font-mono-tabular mt-1 text-lg font-bold @lg:text-2xl text-white">
            {activeFiltered.length} docs
          </p>
        </div>
        <div className="rounded-2xl bg-[#2B2B2E] p-4">
          <span className="text-xs text-zinc-400">Subtotal 15% Acumulado</span>
          <p className="font-mono-tabular mt-1 text-lg font-bold @lg:text-2xl text-white">
            {formatUSD(totalBase)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#2B2B2E] p-4">
          <span className="text-xs text-zinc-400">IVA (15%)</span>
          <p className="font-mono-tabular mt-1 text-lg font-bold @lg:text-2xl text-amber-400">
            {formatUSD(totalTax)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#2B2B2E] p-4">
          <span className="text-xs text-zinc-400">Total Neto Facturado</span>
          <p className="font-mono-tabular mt-1 text-lg font-bold @lg:text-2xl text-[#4CAF50]">
            {formatUSD(totalFacturado)}
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-[#2B2B2E] p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar por número de factura, cédula, RUC o cliente"
            placeholder="Buscar N° (001-001-000001041), cédula, RUC o razón social..."
            className="w-full rounded-full border border-zinc-700 bg-[#18181A] py-2 pr-4 pl-10 text-xs text-white placeholder-zinc-500 focus:border-[#F04E3E] focus:outline-none"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 @lg:flex-row @lg:flex-wrap @lg:items-center">
          <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[#18181A] p-1">
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'consumidor_final', label: 'Consumidor Final' },
                { id: 'con_datos', label: 'Con Datos' },
                { id: 'anulada', label: 'Anuladas' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDocFilter(tab.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  docFilter === tab.id
                    ? 'bg-gradient-to-r from-[#E53935] to-[#F05545] font-semibold text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filtrar por medio de pago"
            value={payFilter}
            onChange={(e) => setPayFilter(e.target.value as 'todos' | PaymentMethod)}
            className="rounded-full border border-zinc-700 bg-[#18181A] px-3.5 py-1.5 text-xs font-medium text-zinc-200 focus:border-[#F04E3E] focus:outline-none"
          >
            <option value="todos">Todos los Medios de Pago</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta de crédito / débito</option>
            <option value="transferencia">Transferencia bancaria</option>
          </select>
        </div>
      </div>

      {/* Order Reports Style Table */}
      <div className="space-y-2.5">
        {/* Pill Header Bar matching reference */}
        <div className="hidden grid-cols-12 items-center gap-3 rounded-full bg-[#2B2B2E] px-6 py-3 text-xs font-medium text-zinc-300 @3xl:grid">
          <div className="col-span-3">Cliente / Adquirente</div>
          <div className="col-span-2">N° Factura / ID</div>
          <div className="col-span-3">Dirección / Mesa</div>
          <div className="col-span-2 text-right">Monto Total</div>
          <div className="col-span-2 text-right">Estado y Acciones</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#2B2B2E] p-12 text-center">
            <FileText className="mb-2 h-8 w-8 text-zinc-500" />
            <p className="text-sm font-bold text-white">
              No se encontraron facturas con los filtros seleccionados
            </p>
          </div>
        ) : (
          filtered.map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl bg-[#242427] px-5 py-3.5 transition-colors hover:bg-[#2B2B2E]"
            >
              <div className="grid grid-cols-2 items-center gap-x-3 gap-y-2 @3xl:grid-cols-12">
                {/* Customer with circular avatar */}
                <div className="col-span-2 flex min-w-0 items-center gap-3 @3xl:col-span-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F04E3E] to-[#B71C1C] text-xs font-bold text-white">
                    {inv.customerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">
                      {inv.customerName}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {PAYMENT_METHOD_LABELS[inv.paymentMethod]} · {inv.issuedDate} {inv.createdAt}
                    </p>
                  </div>
                </div>

                {/* Order / Invoice Number */}
                <div className="font-mono-tabular min-w-0 text-xs @3xl:col-span-2">
                  <span className="font-bold text-zinc-200">{inv.folio}</span>
                  <span className="block text-[11px] text-zinc-400">
                    {getIdLabel(inv.customerTaxId)}: {inv.customerTaxId}
                  </span>
                </div>

                {/* Address / Table */}
                <div className="order-4 col-span-2 min-w-0 text-xs text-zinc-300 @3xl:order-none @3xl:col-span-3">
                  <p className="truncate">{inv.tableOrAddress}</p>
                  <p className="text-[11px] text-zinc-400">
                    {inv.totals.totalItems} ítems · Base {formatUSD(inv.totals.netBase)} + IVA{' '}
                    {formatUSD(inv.totals.ivaTax)}
                  </p>
                </div>

                {/* Amount */}
                <div className="font-mono-tabular order-3 text-right text-sm font-bold text-white @3xl:order-none @3xl:col-span-2 @3xl:text-xs">
                  {formatUSD(inv.totals.grandTotal)}
                </div>

                {/* Status & Action Buttons */}
                <div className="order-5 col-span-2 flex items-center justify-end gap-2 @3xl:order-none @3xl:col-span-2">
                  <button
                    type="button"
                    onClick={() => onInspectInvoice(inv)}
                    aria-label={`Ver factura ${inv.folio}`}
                    className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 ${
                      inv.status === 'emitida'
                        ? 'bg-[#4CAF50]'
                        : 'bg-[#D99B26]'
                    }`}
                  >
                    <Printer className="h-3 w-3" />
                    <span>{inv.status === 'emitida' ? 'Ver RIDE' : 'Anulada'}</span>
                  </button>

                  {inv.status === 'emitida' && (
                    <button
                      type="button"
                      onClick={() => setCancellingId(inv.id)}
                      aria-label={`Anular factura ${inv.folio}`}
                      className="inline-flex items-center gap-1 rounded-full bg-[#38383C] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-red-600 hover:text-white"
                    >
                      <Ban className="h-3 w-3" />
                      <span>Anular</span>
                    </button>
                  )}
                </div>
              </div>

              {cancellingId === inv.id && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-700 pt-3">
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Motivo de anulación / Nota de Crédito..."
                    className="flex-1 rounded-full border border-zinc-600 bg-[#18181A] px-3.5 py-1.5 text-xs text-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmCancel(inv.id)}
                      className="rounded-full bg-[#F04E3E] px-3.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Confirmar Nota de Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancellingId(null)}
                      className="rounded-full bg-[#38383C] px-3.5 py-1.5 text-xs text-zinc-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
