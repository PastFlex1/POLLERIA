import React, { useState } from 'react';
import { Flame, Plus, AlertTriangle, PackageCheck } from 'lucide-react';
import {
  PosProduct,
  InvoiceRecord,
  calculateChickenKardex,
  formatUSD,
} from '../utils/asaderoLogic';

interface ChickenKardexViewProps {
  products: PosProduct[];
  invoices: InvoiceRecord[];
  wholeChickensLoaded: number;
  shrinkageQuarters: number;
  onAddWholeChickensBatch: (count: number) => void;
  onRegisterShrinkageQuarter: (quarters: number) => void;
  onRestockProduct: (productId: string, units: number) => void;
}

export const ChickenKardexView: React.FC<ChickenKardexViewProps> = ({
  products,
  invoices,
  wholeChickensLoaded,
  shrinkageQuarters,
  onAddWholeChickensBatch,
  onRegisterShrinkageQuarter,
  onRestockProduct,
}) => {
  const [batchInput, setBatchInput] = useState<number>(12);
  const kardex = calculateChickenKardex(
    wholeChickensLoaded,
    invoices,
    shrinkageQuarters
  );

  return (
    <div className="@container space-y-5 text-zinc-900">
      <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
        <h2 className="text-lg font-extrabold text-zinc-900 sm:text-xl">
          Kardex de Asadores e Inventario de Presas
        </h2>
        <p className="text-xs text-zinc-500">
          <span className="font-bold text-[#E11D2E]">
            {kardex.remainingWholeChickens} Pollos Enteros Disponibles
          </span>{' '}
          · Descuento automático por cuartos (1 Pollo = 4 Cuartos) al facturar
        </p>
      </div>

      {/* Top Rotisserie Quarter-Chicken Kardex Panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-zinc-200 pb-4">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                Balance de Turno en Hornos de Leña
              </span>
              <h3 className="text-base font-extrabold text-zinc-900">
                Conversión de Pollos Asados vs. Ventas Facturadas
              </h3>
            </div>
            <Flame className="h-5 w-5 text-[#E11D2E]" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 @2xl:grid-cols-4">
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] p-3.5">
              <span className="text-xs font-semibold text-zinc-400">
                Cargados en Turno
              </span>
              <p className="font-mono-tabular mt-1 text-xl font-extrabold text-zinc-900">
                {wholeChickensLoaded} pollos
              </p>
              <span className="font-mono-tabular text-[11px] text-zinc-500">
                ({kardex.totalQuartersLoaded} cuartos)
              </span>
            </div>

            <div className="rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] p-3.5">
              <span className="text-xs font-semibold text-zinc-400">
                Facturados en Caja
              </span>
              <p className="font-mono-tabular mt-1 text-xl font-extrabold text-[#E11D2E]">
                {kardex.soldWholeEquivalent} pollos
              </p>
              <span className="font-mono-tabular text-[11px] text-zinc-500">
                ({kardex.quartersSold} cuartos vendidos)
              </span>
            </div>

            <div className="rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] p-3.5">
              <span className="text-xs font-semibold text-zinc-400">
                Merma Registrada
              </span>
              <p className="font-mono-tabular mt-1 text-xl font-extrabold text-amber-600">
                {shrinkageQuarters} cuartos
              </p>
              <span className="text-[11px] text-zinc-500">
                Consumo / sobrecocción
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
              <span className="text-xs font-bold text-emerald-700">
                Saldo en Asador
              </span>
              <p className="font-mono-tabular mt-1 text-xl font-extrabold text-zinc-900">
                {kardex.remainingWholeChickens} ent. +{' '}
                {kardex.remainingLooseQuarters}/4
              </p>
              <span className="font-mono-tabular text-[11px] text-emerald-700">
                ({kardex.remainingQuarters} cuartos libres)
              </span>
            </div>
          </div>
        </div>

        {/* Actions: Load New Chicken Batch or Log Shrinkage */}
        <div className="flex flex-col justify-between rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] lg:col-span-4">
          <div>
            <h3 className="text-sm font-extrabold text-zinc-900">
              Cargar Nueva Tanda al Asador
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Suma pollos enteros crudos montados en varilla o descuenta cuartos
              por merma.
            </p>

            <div className="mt-4">
              <label
                htmlFor="batch-chickens-input"
                className="mb-1 block text-xs font-bold text-zinc-600"
              >
                Pollos Enteros a Montar
              </label>
              <div className="flex gap-2">
                <input
                  id="batch-chickens-input"
                  type="number"
                  min={1}
                  max={36}
                  value={batchInput}
                  onChange={(e) =>
                    setBatchInput(
                      Math.min(36, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  className="font-mono-tabular w-20 rounded-full border border-zinc-200 bg-[#F8F9FC] px-3 py-2 text-center text-sm font-extrabold text-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => onAddWholeChickensBatch(batchInput)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#111318] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ingresar Tanda (+{batchInput})</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-dashed border-zinc-200 pt-3">
            <button
              type="button"
              onClick={() => onRegisterShrinkageQuarter(1)}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 whitespace-nowrap shrink-0"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Registrar 1/4 de Pollo por Merma</span>
            </button>
          </div>
        </div>
      </div>

      {/* Itemized PLU Stock Table */}
      <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] space-y-2.5">
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-[#E11D2E]" />
            <h3 className="text-sm font-extrabold text-zinc-900">
              Existencias por Código PLU ({products.length} ítems)
            </h3>
          </div>
        </div>

        <div className="hidden grid-cols-12 items-center gap-3 rounded-full bg-[#F4F5F9] px-5 py-2.5 text-[11px] font-bold tracking-wider text-zinc-400 uppercase @3xl:grid">
          <div className="col-span-2">Código PLU</div>
          <div className="col-span-4">Plato / Producto</div>
          <div className="col-span-2 text-right">Precio Venta</div>
          <div className="col-span-2 text-right">Kardex Pollo</div>
          <div className="col-span-2 text-right">Stock / Entrada</div>
        </div>

        {products.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-2 items-center gap-x-3 gap-y-2 rounded-[20px] border border-dashed border-zinc-200/90 bg-[#FCFDFE] px-4 py-3 transition-all hover:border-zinc-300 @3xl:grid-cols-12 @3xl:px-5"
          >
            <div className="font-mono-tabular order-2 text-xs font-bold text-zinc-500 @3xl:order-none @3xl:col-span-2">
              {p.plu}
            </div>
            <div className="order-1 col-span-2 flex min-w-0 items-center gap-3 @3xl:order-none @3xl:col-span-4">
              <img
                src={p.imageUrl}
                alt={p.shortName}
                referrerPolicy="no-referrer"
                className="h-10 w-10 shrink-0 rounded-full object-cover shadow-2xs"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-zinc-900">
                  {p.name}
                </p>
                <p className="text-[11px] text-zinc-400">{p.categoryLabel}</p>
              </div>
            </div>
            <div className="font-mono-tabular order-3 text-right text-xs font-extrabold text-[#E11D2E] @3xl:order-none @3xl:col-span-2">
              {formatUSD(p.price)}
            </div>
            <div className="font-mono-tabular order-4 text-xs text-zinc-500 @3xl:order-none @3xl:col-span-2 @3xl:text-right">
              {p.chickenQuartersEquivalent > 0
                ? `-${p.chickenQuartersEquivalent} cuartos`
                : 'Guarnición / Bebida'}
            </div>
            <div className="order-5 flex items-center justify-end gap-2 @3xl:order-none @3xl:col-span-2">
              <span
                className={`font-mono-tabular rounded-full px-3 py-1 text-[11px] font-bold text-white ${
                  p.stockUnits <= 10 ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
              >
                {p.stockUnits} uds
              </span>
              <button
                type="button"
                onClick={() => onRestockProduct(p.id, 10)}
                className="rounded-full bg-[#111318] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-zinc-800"
              >
                +10
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
