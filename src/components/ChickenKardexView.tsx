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
    <div className="@container space-y-6 text-zinc-100">
      <div>
        <h2 className="text-xl font-bold text-white">
          Kardex de Asadores e Inventario de Presas
        </h2>
        <p className="text-xs text-zinc-400">
          <span className="font-semibold text-[#F04E3E]">
            {kardex.remainingWholeChickens} Pollos Enteros Disponibles
          </span>{' '}
          · Descuento automático por cuartos (1 Pollo = 4 Cuartos) al facturar
        </p>
      </div>

      {/* Top Rotisserie Quarter-Chicken Kardex Panel */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-2xl bg-[#2B2B2E] p-4 sm:p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-700/80 pb-4">
            <div>
              <span className="text-xs text-zinc-400">
                Balance de Turno en Hornos de Leña
              </span>
              <h3 className="text-base font-bold text-white">
                Conversión de Pollos Asados vs. Ventas Facturadas
              </h3>
            </div>
            <Flame className="h-5 w-5 text-[#F04E3E]" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 @2xl:grid-cols-4">
            <div className="rounded-xl bg-[#1E1E21] p-3.5">
              <span className="text-xs text-zinc-400">Cargados en Turno</span>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-white">
                {wholeChickensLoaded} pollos
              </p>
              <span className="font-mono-tabular text-[11px] text-zinc-400">
                ({kardex.totalQuartersLoaded} cuartos)
              </span>
            </div>

            <div className="rounded-xl bg-[#1E1E21] p-3.5">
              <span className="text-xs text-zinc-400">Facturados en Caja</span>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-[#F04E3E]">
                {kardex.soldWholeEquivalent} pollos
              </p>
              <span className="font-mono-tabular text-[11px] text-zinc-400">
                ({kardex.quartersSold} cuartos vendidos)
              </span>
            </div>

            <div className="rounded-xl bg-[#1E1E21] p-3.5">
              <span className="text-xs text-zinc-400">Merma Registrada</span>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-[#D99B26]">
                {shrinkageQuarters} cuartos
              </p>
              <span className="text-[11px] text-zinc-400">
                Consumo / sobrecocción
              </span>
            </div>

            <div className="rounded-xl border border-[#4CAF50]/30 bg-[#4CAF50]/10 p-3.5">
              <span className="text-xs font-medium text-[#4CAF50]">
                Saldo en Asador
              </span>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-white">
                {kardex.remainingWholeChickens} ent. + {kardex.remainingLooseQuarters}/4
              </p>
              <span className="font-mono-tabular text-[11px] text-zinc-300">
                ({kardex.remainingQuarters} cuartos libres)
              </span>
            </div>
          </div>
        </div>

        {/* Actions: Load New Chicken Batch or Log Shrinkage */}
        <div className="flex flex-col justify-between rounded-2xl bg-[#2B2B2E] p-4 sm:p-5 lg:col-span-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Cargar Nueva Tanda al Asador
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Suma pollos enteros crudos montados en varilla o descuenta cuartos
              por merma.
            </p>

            <div className="mt-4">
              <label
                htmlFor="batch-chickens-input"
                className="mb-1 block text-xs font-semibold text-zinc-300"
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
                  className="font-mono-tabular w-20 rounded-full border border-zinc-700 bg-[#18181A] px-3 py-2 text-center text-sm font-bold text-white"
                />
                <button
                  type="button"
                  onClick={() => onAddWholeChickensBatch(batchInput)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#E53935] to-[#F05545] px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ingresar Tanda (+{batchInput})</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-zinc-700/80 pt-3">
            <button
              type="button"
              onClick={() => onRegisterShrinkageQuarter(1)}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#38383C] px-3 py-2 text-xs font-semibold text-[#D99B26] hover:bg-[#45454A] whitespace-nowrap shrink-0"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Registrar 1/4 de Pollo por Merma</span>
            </button>
          </div>
        </div>
      </div>

      {/* Itemized PLU Stock Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-[#F04E3E]" />
            <h3 className="text-sm font-bold text-white">
              Existencias por Código PLU ({products.length} ítems)
            </h3>
          </div>
        </div>

        <div className="hidden grid-cols-12 items-center gap-3 rounded-full bg-[#2B2B2E] px-6 py-3 text-xs font-medium text-zinc-300 @3xl:grid">
          <div className="col-span-2">Código PLU</div>
          <div className="col-span-4">Plato / Producto</div>
          <div className="col-span-2 text-right">Precio Venta</div>
          <div className="col-span-2 text-right">Kardex Pollo</div>
          <div className="col-span-2 text-right">Stock / Entrada</div>
        </div>

        {products.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-2 items-center gap-x-3 gap-y-2 rounded-2xl bg-[#242427] px-4 py-3 transition-colors hover:bg-[#2B2B2E] @3xl:grid-cols-12 @3xl:px-5"
          >
            <div className="font-mono-tabular order-2 text-xs font-bold text-zinc-300 @3xl:order-none @3xl:col-span-2">
              {p.plu}
            </div>
            <div className="order-1 col-span-2 flex min-w-0 items-center gap-3 @3xl:order-none @3xl:col-span-4">
              <img
                src={p.imageUrl}
                alt={p.shortName}
                referrerPolicy="no-referrer"
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
              <div>
                <p className="text-xs font-bold text-white">{p.name}</p>
                <p className="text-[11px] text-zinc-400">{p.categoryLabel}</p>
              </div>
            </div>
            <div className="font-mono-tabular order-3 text-right text-xs font-semibold text-white @3xl:order-none @3xl:col-span-2">
              {formatUSD(p.price)}
            </div>
            <div className="font-mono-tabular order-4 text-xs text-zinc-400 @3xl:order-none @3xl:col-span-2 @3xl:text-right">
              {p.chickenQuartersEquivalent > 0
                ? `-${p.chickenQuartersEquivalent} cuartos`
                : 'Guarnición / Bebida'}
            </div>
            <div className="order-5 flex items-center justify-end gap-2 @3xl:order-none @3xl:col-span-2">
              <span
                className={`font-mono-tabular rounded-full px-3 py-1 text-[11px] font-bold text-white ${
                  p.stockUnits <= 10 ? 'bg-[#D99B26]' : 'bg-[#4CAF50]'
                }`}
              >
                {p.stockUnits} uds
              </span>
              <button
                type="button"
                onClick={() => onRestockProduct(p.id, 10)}
                className="rounded-full bg-[#38383C] px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-600"
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
