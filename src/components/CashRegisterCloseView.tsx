import React, { useState } from 'react';
import {
  Calculator,
  Plus,
  CheckCircle2,
  AlertCircle,
  Printer,
} from 'lucide-react';
import {
  InvoiceRecord,
  CashExpense,
  calculateCashReconciliation,
  formatUSD,
} from '../utils/asaderoLogic';

interface CashRegisterCloseViewProps {
  invoices: InvoiceRecord[];
  expenses: CashExpense[];
  openingCash: number;
  onAddExpense: (
    concept: string,
    supplierOrAuth: string,
    amount: number
  ) => void;
}

export const CashRegisterCloseView: React.FC<CashRegisterCloseViewProps> = ({
  invoices,
  expenses,
  openingCash,
  onAddExpense,
}) => {
  const [countedCash, setCountedCash] = useState<number>(101.75);
  const [concept, setConcept] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [expenseError, setExpenseError] = useState<string>('');
  const [zReportPrinted, setZReportPrinted] = useState<boolean>(false);

  const summary = calculateCashReconciliation(
    invoices,
    expenses,
    openingCash,
    countedCash
  );

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountStr);
    if (!concept.trim() || concept.trim().length < 3) {
      setExpenseError('Describe el concepto del gasto o salida de caja.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setExpenseError('Ingresa un valor en dólares mayor a cero.');
      return;
    }
    setExpenseError('');
    onAddExpense(
      concept.trim(),
      supplier.trim() || 'Caja Chica Turno',
      numericAmount
    );
    setConcept('');
    setSupplier('');
    setAmountStr('');
  };

  const handlePrintZReport = () => {
    setZReportPrinted(true);
    setTimeout(() => setZReportPrinted(false), 2500);
  };

  return (
    <div className="space-y-5 text-zinc-900">
      <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
        <h2 className="text-lg font-extrabold text-zinc-900 sm:text-xl">
          Finanzas, Arqueo y Cierre de Caja
        </h2>
        <p className="text-xs text-zinc-500">
          <span className="font-bold text-[#E11D2E]">
            Conciliación de Efectivo y Medios Electrónicos
          </span>{' '}
          · Cuadre de gaveta, vales de caja chica y reporte de cierre
        </p>
      </div>

      {/* Top 4 Reconciliation Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
          <span className="text-xs font-semibold text-zinc-400">
            Total Ventas Netas (Turno)
          </span>
          <p className="font-mono-tabular mt-1 text-2xl font-extrabold text-zinc-900">
            {formatUSD(summary.totalActiveSales)}
          </p>
          <span className="mt-1 block text-[11px] text-zinc-400">
            {summary.activeInvoicesCount} facturas emitidas ·{' '}
            {summary.cancelledInvoicesCount} anuladas
          </span>
        </div>

        <div className="rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
          <span className="text-xs font-semibold text-zinc-400">
            Cobros Electrónicos (Tarjeta + Transf.)
          </span>
          <p className="font-mono-tabular mt-1 text-2xl font-extrabold text-zinc-900">
            {formatUSD(summary.cardSales + summary.transferSales)}
          </p>
          <span className="font-mono-tabular mt-1 block text-[11px] text-zinc-400">
            Tarjeta: {formatUSD(summary.cardSales)} · Transf:{' '}
            {formatUSD(summary.transferSales)}
          </span>
        </div>

        <div className="rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
          <span className="text-xs font-semibold text-zinc-400">
            Gastos Caja Chica
          </span>
          <p className="font-mono-tabular mt-1 text-2xl font-extrabold text-amber-600">
            -{formatUSD(summary.totalCashExpenses)}
          </p>
          <span className="mt-1 block text-[11px] text-zinc-400">
            {expenses.length} comprobantes de egreso
          </span>
        </div>

        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4">
          <span className="text-xs font-bold text-emerald-700">
            Efectivo Esperado en Gaveta
          </span>
          <p className="font-mono-tabular mt-1 text-2xl font-extrabold text-zinc-900">
            {formatUSD(summary.expectedCashInDrawer)}
          </p>
          <span className="font-mono-tabular mt-1 block text-[11px] text-emerald-700">
            Base {formatUSD(summary.openingCash)} + Efectivo{' '}
            {formatUSD(summary.cashSales)} - Egresos
          </span>
        </div>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Physical Cash Drawer Audit & Z-Report */}
        <div className="flex flex-col justify-between rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] lg:col-span-6">
          <div>
            <div className="flex items-center justify-between border-b border-dashed border-zinc-200 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-zinc-900">
                  Arqueo de Efectivo y Reporte de Cierre
                </h3>
                <p className="text-xs text-zinc-500">
                  Compara el efectivo físico contado en billetes contra el saldo
                  teórico.
                </p>
              </div>
              <Calculator className="h-5 w-5 text-[#E11D2E]" />
            </div>

            <div className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between border-b border-dashed border-zinc-200 pb-2">
                <span className="text-zinc-500">
                  (+) Base Inicial de Apertura de Caja:
                </span>
                <span className="font-mono-tabular font-bold text-zinc-900">
                  {formatUSD(summary.openingCash)}
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-zinc-200 pb-2">
                <span className="text-zinc-500">
                  (+) Ventas Cobradas en Efectivo:
                </span>
                <span className="font-mono-tabular font-bold text-zinc-900">
                  {formatUSD(summary.cashSales)}
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-zinc-200 pb-2">
                <span className="text-zinc-500">
                  (-) Vales / Gastos Pagados por Caja:
                </span>
                <span className="font-mono-tabular font-bold text-amber-600">
                  -{formatUSD(summary.totalCashExpenses)}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 pb-3 text-sm font-extrabold text-zinc-900">
                <span>(=) Efectivo Teórico en Gaveta:</span>
                <span className="font-mono-tabular">
                  {formatUSD(summary.expectedCashInDrawer)}
                </span>
              </div>
            </div>

            {/* Physical Count Input */}
            <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label
                  htmlFor="counted-cash-input"
                  className="text-xs font-bold text-zinc-700"
                >
                  Efectivo Físico Contado en Gaveta ($):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="counted-cash-input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={countedCash}
                    onChange={(e) =>
                      setCountedCash(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="font-mono-tabular w-36 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-right text-sm font-extrabold text-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => setCountedCash(summary.expectedCashInDrawer)}
                    className="rounded-full bg-[#111318] px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800"
                  >
                    Cuadrar Exacto
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-dashed border-zinc-200 pt-3">
                <span className="text-xs font-bold text-zinc-500">
                  Estado de Cuadre de Caja:
                </span>
                {summary.discrepancy === 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Caja Cuadrada ($0)</span>
                  </span>
                ) : (
                  <span className="font-mono-tabular inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>
                      {summary.discrepancy > 0 ? 'Sobrante: +' : 'Faltante: '}
                      {formatUSD(summary.discrepancy)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-2">
            <button
              type="button"
              onClick={handlePrintZReport}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#E11D2E] py-3.5 text-xs font-bold text-white shadow-[0_10px_25px_rgba(225,29,46,0.28)] hover:bg-[#C81625] whitespace-nowrap shrink-0"
            >
              <Printer className="h-4 w-4" />
              <span>
                {zReportPrinted
                  ? 'Reporte de Cierre de Caja Emitido Correctamente'
                  : 'Emitir e Imprimir Reporte de Cierre de Caja'}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Minor Cash Expenses */}
        <div className="flex flex-col justify-between rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] lg:col-span-6">
          <div>
            <h3 className="text-base font-extrabold text-zinc-900">
              Comprobantes de Egreso / Gastos de Turno
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Registra pagos a proveedores en efectivo (carbón, fundas, hielo,
              domiciliarios) que descuentan de la gaveta.
            </p>

            <form
              onSubmit={handleAddExpenseSubmit}
              className="mt-4 space-y-3 rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="expense-concept"
                    className="mb-1 block text-xs font-bold text-zinc-600"
                  >
                    Concepto del Gasto
                  </label>
                  <input
                    id="expense-concept"
                    type="text"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="Ej. Compra 2 fundas de hielo y limones"
                    className="w-full rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="expense-amount"
                    className="mb-1 block text-xs font-bold text-zinc-600"
                  >
                    Valor ($)
                  </label>
                  <input
                    id="expense-amount"
                    type="number"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="5.00"
                    step={0.01}
                    min={0}
                    className="font-mono-tabular w-full rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-extrabold text-zinc-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  aria-label="Proveedor o autorizado por"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Proveedor / Autorizado por (opcional)"
                  className="flex-1 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs text-zinc-900"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#111318] px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Registrar Egreso</span>
                </button>
              </div>
              {expenseError && (
                <p className="text-xs font-bold text-[#E11D2E]">
                  {expenseError}
                </p>
              )}
            </form>

            {/* Expenses List */}
            <div className="mt-4 divide-y divide-dashed divide-zinc-200 border-t border-dashed border-zinc-200">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between py-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-zinc-900">{exp.concept}</p>
                    <p className="text-[11px] text-zinc-400">
                      {exp.time} · {exp.supplierOrAuth}
                    </p>
                  </div>
                  <span className="font-mono-tabular font-extrabold text-[#E11D2E]">
                    -{formatUSD(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
