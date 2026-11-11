import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Receipt,
  Landmark,
  Users,
  Plus,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  InvoiceRecord,
  CashExpense,
  formatUSD,
  roundUSD,
  BUSINESS_INFO,
  formatDateEC,
} from '../utils/asaderoLogic';
import {
  AccountingSubModule,
  PurchaseRecord,
  PurchaseCategory,
  PurchasePaymentStatus,
  JournalEntry,
  EmployeePayrollItem,
  CHART_OF_ACCOUNTS,
  SRI_IR_WITHHOLDING_RULES,
  PURCHASE_CATEGORY_LABELS,
  generateJournalEntries,
  calculateSriTaxSummary,
  calculateFinancialStatements,
  calculateTrialBalance,
  createPurchaseRecord,
  buildEmployeePayrollItem,
} from '../utils/accountingLogic';

interface AccountingViewProps {
  invoices: InvoiceRecord[];
  expenses: CashExpense[];
  openingCash: number;
  purchases: PurchaseRecord[];
  manualEntries: JournalEntry[];
  payroll: EmployeePayrollItem[];
  onAddPurchase: (purchase: PurchaseRecord) => void;
  onMarkPurchasePaid: (
    purchaseId: string,
    method: 'efectivo' | 'transferencia'
  ) => void;
  onAddManualEntry: (entry: JournalEntry) => void;
  onTogglePayrollPaid: (empId: string) => void;
  onAddOvertimeHour: (empId: string, deltaHours: number) => void;
  onAddEmployee: (emp: EmployeePayrollItem) => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  invoices,
  expenses,
  openingCash,
  purchases,
  manualEntries,
  payroll,
  onAddPurchase,
  onMarkPurchasePaid,
  onAddManualEntry,
  onTogglePayrollPaid,
  onAddOvertimeHour,
  onAddEmployee,
}) => {
  const [activeTab, setActiveTab] =
    useState<AccountingSubModule>('estados_financieros');

  // --- Derived Accounting Calculations ---
  const journalEntries = useMemo(
    () => generateJournalEntries(invoices, purchases, expenses, manualEntries),
    [invoices, purchases, expenses, manualEntries]
  );

  const trialBalance = useMemo(
    () => calculateTrialBalance(journalEntries),
    [journalEntries]
  );

  const sriSummary = useMemo(
    () => calculateSriTaxSummary(invoices, purchases),
    [invoices, purchases]
  );

  const financials = useMemo(
    () =>
      calculateFinancialStatements({
        invoices,
        purchases,
        expenses,
        payroll,
        openingCash,
      }),
    [invoices, purchases, expenses, payroll, openingCash]
  );

  // --- Tab 1: Plan de Cuentas filter ---
  const [accountGroupFilter, setAccountGroupFilter] = useState<string>('todos');

  // --- Tab 2: Libro Diario / Mayor view mode, filters & Manual Entry state ---
  const [ledgerMode, setLedgerMode] = useState<'diario' | 'mayor'>('diario');
  const [expandedAccountCode, setExpandedAccountCode] = useState<string | null>(
    '1.1.01.01'
  );
  const [journalSourceFilter, setJournalSourceFilter] = useState<
    'todos' | JournalEntry['source']
  >('todos');
  const [journalSearch, setJournalSearch] = useState<string>('');
  const [debitAccountCode, setDebitAccountCode] =
    useState<string>('5.2.02.02');
  const [creditAccountCode, setCreditAccountCode] =
    useState<string>('1.1.01.02');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualGloss, setManualGloss] = useState<string>('');
  const [manualRef, setManualRef] = useState<string>('COMP-DIARIO');
  const [manualError, setManualError] = useState<string>('');

  // --- Tab 3: Nueva Compra & Retención state ---
  const [supName, setSupName] = useState<string>('');
  const [supRuc, setSupRuc] = useState<string>('');
  const [supInvoiceNum, setSupInvoiceNum] = useState<string>(
    '001-001-000051200'
  );
  const [supCategory, setSupCategory] = useState<PurchaseCategory>(
    'materia_prima_avicola'
  );
  const [supDesc, setSupDesc] = useState<string>('');
  const [supSub0, setSupSub0] = useState<string>('0');
  const [supSub15, setSupSub15] = useState<string>('50.00');
  const [supIrCode, setSupIrCode] = useState<string>('312');
  const [supIvaRetPct, setSupIvaRetPct] = useState<0 | 30 | 70 | 100>(30);
  const [supStatus, setSupStatus] =
    useState<PurchasePaymentStatus>('pagada');
  const [supPayMethod, setSupPayMethod] = useState<
    'efectivo' | 'transferencia'
  >('transferencia');
  const [purchaseError, setPurchaseError] = useState<string>('');

  // --- Tab 4: ATS XML Preview Modal/Toggle ---
  const [showAtsPreview, setShowAtsPreview] = useState<boolean>(false);

  // --- Tab 5: Nuevo Empleado state ---
  const [empName, setEmpName] = useState<string>('');
  const [empCedula, setEmpCedula] = useState<string>('');
  const [empRole, setEmpRole] = useState<string>(
    'Ayudante de Parrilla y Despacho'
  );
  const [empSalary, setEmpSalary] = useState<string>('470');
  const [empError, setEmpError] = useState<string>('');

  // Preview calculation for new purchase form
  const previewPurchase = useMemo(() => {
    return createPurchaseRecord({
      id: 'preview',
      invoiceNumber: supInvoiceNum,
      supplierName: supName || 'Proveedor',
      supplierRuc: supRuc || '1790000000001',
      category: supCategory,
      description: supDesc,
      subtotalZero: Number(supSub0) || 0,
      subtotalTaxed: Number(supSub15) || 0,
      irWithholdingCode: supIrCode,
      ivaWithholdingPercent: supIvaRetPct,
      status: supStatus,
      paymentMethod: supPayMethod,
    });
  }, [
    supInvoiceNum,
    supName,
    supRuc,
    supCategory,
    supDesc,
    supSub0,
    supSub15,
    supIrCode,
    supIvaRetPct,
    supStatus,
    supPayMethod,
  ]);

  const handleCreateManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = roundUSD(Number(manualAmount) || 0);
    if (amount <= 0) {
      setManualError('Ingresa un monto en dólares mayor a $0.00.');
      return;
    }
    if (debitAccountCode === creditAccountCode) {
      setManualError(
        'La cuenta al Debe y la cuenta al Haber deben ser distintas para cumplir partida doble.'
      );
      return;
    }
    if (manualGloss.trim().length < 4) {
      setManualError('Escribe una glosa o concepto descriptivo del asiento.');
      return;
    }

    const debitAcc = CHART_OF_ACCOUNTS.find((a) => a.code === debitAccountCode);
    const creditAcc = CHART_OF_ACCOUNTS.find(
      (a) => a.code === creditAccountCode
    );
    if (!debitAcc || !creditAcc) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    onAddManualEntry({
      id: `je-man-${Date.now()}`,
      entryNumber: 'ASI-MAN',
      date: formatDateEC(now),
      time: timeStr,
      source: 'manual',
      referenceDoc: manualRef.trim() || 'ASIENTO-MANUAL',
      description: manualGloss.trim(),
      lines: [
        {
          accountCode: debitAcc.code,
          accountName: debitAcc.name,
          debit: amount,
          credit: 0,
        },
        {
          accountCode: creditAcc.code,
          accountName: creditAcc.name,
          debit: 0,
          credit: amount,
        },
      ],
      totalDebit: amount,
      totalCredit: amount,
    });

    setManualAmount('');
    setManualGloss('');
    setManualError('');
  };

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (supName.trim().length < 3) {
      setPurchaseError('Ingresa la razón social del proveedor.');
      return;
    }
    if (!/^\d{10,13}$/.test(supRuc.trim())) {
      setPurchaseError(
        'Ingresa un RUC (13 dígitos) o cédula (10 dígitos) válido del proveedor.'
      );
      return;
    }
    const sub0 = Number(supSub0) || 0;
    const sub15 = Number(supSub15) || 0;
    if (sub0 + sub15 <= 0) {
      setPurchaseError(
        'El subtotal de la factura (0% + 15%) debe ser mayor a $0.00.'
      );
      return;
    }
    if (supDesc.trim().length < 3) {
      setPurchaseError('Describe los insumos o servicios adquiridos.');
      return;
    }

    const record = createPurchaseRecord({
      id: `pur-${Date.now()}`,
      invoiceNumber: supInvoiceNum.trim() || '001-001-000051200',
      supplierName: supName.trim(),
      supplierRuc: supRuc.trim(),
      category: supCategory,
      description: supDesc.trim(),
      subtotalZero: sub0,
      subtotalTaxed: sub15,
      irWithholdingCode: supIrCode,
      ivaWithholdingPercent: supIvaRetPct,
      status: supStatus,
      paymentMethod: supPayMethod,
    });

    onAddPurchase(record);
    setSupName('');
    setSupRuc('');
    setSupDesc('');
    setSupSub0('0');
    setSupSub15('0');
    setPurchaseError('');
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (empName.trim().length < 3) {
      setEmpError('Ingresa los nombres y apellidos del colaborador.');
      return;
    }
    if (!/^\d{10}$/.test(empCedula.trim())) {
      setEmpError('Ingresa un número de cédula válido de 10 dígitos.');
      return;
    }
    const salaryNum = Number(empSalary) || 0;
    if (salaryNum < 470) {
      setEmpError(
        'El sueldo base no puede ser menor al Salario Básico Unificado ($470.00).'
      );
      return;
    }

    onAddEmployee(
      buildEmployeePayrollItem({
        id: `emp-${Date.now()}`,
        name: empName.trim(),
        cedula: empCedula.trim(),
        role: empRole.trim() || 'Operador de Asadero',
        baseSalary: salaryNum,
        overtimeHours: 0,
        paidStatus: 'pendiente',
      })
    );
    setEmpName('');
    setEmpCedula('');
    setEmpError('');
  };

  const atsXmlString = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `<?xml version="1.0" encoding="UTF-8"?>
<iva>
  <TipoIDInformante>R</TipoIDInformante>
  <IdInformante>${BUSINESS_INFO.ruc}</IdInformante>
  <razonSocial>${BUSINESS_INFO.legalName}</razonSocial>
  <Anio>${year}</Anio>
  <Mes>${month}</Mes>
  <numEstabRuc>001</numEstabRuc>
  <totalVentas>${sriSummary.salesBase15.toFixed(2)}</totalVentas>
  <codigoOperativo>IVA</codigoOperativo>
  <compras>
${purchases
  .map(
    (p) => `    <detalleCompras>
      <codSustento>01</codSustento>
      <tpIdProv>01</tpIdProv>
      <idProv>${p.supplierRuc}</idProv>
      <tipoComprobante>01</tipoComprobante>
      <fechaEmision>${p.issuedDate}</fechaEmision>
      <baseImponible>${p.subtotalZero.toFixed(2)}</baseImponible>
      <baseImpGrav>${p.subtotalTaxed.toFixed(2)}</baseImpGrav>
      <montoIva>${p.ivaAmount.toFixed(2)}</montoIva>
      <valRetBienes>${p.ivaWithholdingAmount.toFixed(2)}</valRetBienes>
      <air>
        <detalleAir>
          <codRetAir>${p.irWithholdingCode}</codRetAir>
          <baseImpAir>${(p.subtotalZero + p.subtotalTaxed).toFixed(2)}</baseImpAir>
          <porcentajeAir>${p.irWithholdingPercent.toFixed(2)}</porcentajeAir>
          <valRetAir>${p.irWithholdingAmount.toFixed(2)}</valRetAir>
        </detalleAir>
      </air>
    </detalleCompras>`
  )
  .join('\n')}
  </compras>
  <ventas>
    <detalleVentas>
      <tpIdCliente>07</tpIdCliente>
      <idCliente>9999999999999</idCliente>
      <tipoComprobante>18</tipoComprobante>
      <numeroComprobantes>${sriSummary.activeInvoicesCount}</numeroComprobantes>
      <baseImpGrav>${sriSummary.salesBase15.toFixed(2)}</baseImpGrav>
      <montoIva>${sriSummary.salesIva15.toFixed(2)}</montoIva>
    </detalleVentas>
  </ventas>
</iva>`;
  }, [purchases, sriSummary]);

  const handleDownloadAtsXml = () => {
    const blob = new Blob([atsXmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATS-${BUSINESS_INFO.ruc}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredJournal = useMemo(() => {
    return journalEntries.filter((entry) => {
      const matchesSource =
        journalSourceFilter === 'todos' || entry.source === journalSourceFilter;
      const q = journalSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        entry.entryNumber.toLowerCase().includes(q) ||
        entry.referenceDoc.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.lines.some(
          (l) =>
            l.accountCode.toLowerCase().includes(q) ||
            l.accountName.toLowerCase().includes(q)
        );
      return matchesSource && matchesQuery;
    });
  }, [journalEntries, journalSourceFilter, journalSearch]);

  const subModuleTabs: {
    id: AccountingSubModule;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'estados_financieros',
      label: 'Estados Financieros',
      icon: Scale,
    },
    {
      id: 'libro_diario',
      label: 'Libro Diario y Mayor',
      icon: BookOpen,
    },
    {
      id: 'compras_retenciones',
      label: 'Compras y Retenciones',
      icon: Receipt,
    },
    {
      id: 'impuestos_sri',
      label: 'Impuestos SRI (104/103)',
      icon: Landmark,
    },
    {
      id: 'nomina_iess',
      label: 'Nómina y Rol IESS',
      icon: Users,
    },
  ];

  const sourceBadge = (source: JournalEntry['source']) => {
    switch (source) {
      case 'venta_pos':
        return (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[#4CAF50]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#4CAF50]">
            Venta POS
          </span>
        );
      case 'anulacion_nc':
        return (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[#F04E3E]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#F04E3E]">
            Nota Crédito
          </span>
        );
      case 'compra_proveedor':
        return (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-bold text-sky-400">
            Compra / Ret.
          </span>
        );
      case 'caja_chica':
        return (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
            Caja Chica
          </span>
        );
      case 'manual':
        return (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
            Asiento Manual
          </span>
        );
    }
  };

  return (
    <div className="@container space-y-5 text-zinc-100">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-[#F04E3E]" />
            <h2 className="truncate text-lg font-bold text-white sm:text-xl">
              Contabilidad General NIIF &amp; Tributación SRI
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            <span className="font-semibold text-[#F04E3E]">
              {BUSINESS_INFO.legalName} · RUC {BUSINESS_INFO.ruc}
            </span>{' '}
            · Obligado a llevar contabilidad · Integración en vivo con POS y
            Caja
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#4CAF50]/30 bg-[#4CAF50]/10 px-3 py-1 text-xs font-semibold text-[#4CAF50]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Partida Doble Cuadrada ({journalEntries.length} asientos)
          </span>
        </div>
      </div>

      {/* Sub-module Responsive Grid Navigation Bar (never overflows or clips) */}
      <div
        role="tablist"
        aria-label="Módulos de contabilidad"
        className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#252528] p-1.5 shadow-inner sm:grid-cols-3 lg:grid-cols-5"
      >
        {subModuleTabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-semibold transition-all xl:gap-2 xl:px-3 xl:text-xs ${
                idx === 4 ? 'col-span-2 sm:col-span-1' : ''
              } ${
                isActive
                  ? 'bg-gradient-to-r from-[#E53935] to-[#F05545] text-white shadow-md'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 xl:h-4 xl:w-4" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          MODULE 1: ESTADOS FINANCIEROS (P&G + BALANCE GENERAL + PLAN CUENTAS)
         ===================================================================== */}
      {activeTab === 'estados_financieros' && (
        <div className="space-y-4">
          {/* Top 4 Executive Financial KPIs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex min-w-0 flex-col justify-between rounded-2xl bg-[#2B2B2E] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-zinc-400">
                  Ingresos Netos (Sin IVA)
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[#4CAF50]" />
              </div>
              <p className="font-mono-tabular mt-1 truncate text-xl font-bold text-white xl:text-2xl">
                {formatUSD(financials.totalNetRevenue)}
              </p>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                Facturado Bruto: {formatUSD(sriSummary.grossSalesTotal)} (Inc.
                IVA)
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-2xl bg-[#2B2B2E] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-zinc-400">
                  Utilidad Bruta Ventas
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-[#4CAF50]/20 px-2 py-0.5 text-[10px] font-bold text-[#4CAF50]">
                  Margen {financials.grossMarginPct}%
                </span>
              </div>
              <p className="font-mono-tabular mt-1 truncate text-xl font-bold text-white xl:text-2xl">
                {formatUSD(financials.grossProfit)}
              </p>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                Costo de Ventas: -{formatUSD(financials.totalCostOfSales)}
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-2xl bg-[#2B2B2E] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-zinc-400">
                  Utilidad Neta Período
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    financials.netIncome >= 0
                      ? 'bg-[#4CAF50]/20 text-[#4CAF50]'
                      : 'bg-[#F04E3E]/20 text-[#F04E3E]'
                  }`}
                >
                  Neto {financials.netMarginPct}%
                </span>
              </div>
              <p
                className={`font-mono-tabular mt-1 truncate text-xl font-bold xl:text-2xl ${
                  financials.netIncome >= 0 ? 'text-[#4CAF50]' : 'text-[#F04E3E]'
                }`}
              >
                {formatUSD(financials.netIncome)}
              </p>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                Post 15% Trab. y 25% Imp. Renta
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#4CAF50]/30 bg-[#4CAF50]/10 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-[#4CAF50]">
                  Ecuación Patrimonial NIIF
                </span>
                <Scale className="h-4 w-4 shrink-0 text-[#4CAF50]" />
              </div>
              <p className="font-mono-tabular mt-1 truncate text-xl font-bold text-white xl:text-2xl">
                {formatUSD(financials.totalAssets)}
              </p>
              <span className="font-mono-tabular mt-0.5 block truncate text-[11px] text-zinc-300">
                Pasivo {formatUSD(financials.totalLiabilities)} + Patrim.{' '}
                {formatUSD(financials.totalEquity)}
              </span>
            </div>
          </div>

          {/* Main 2-Column Financial Statements: P&L + Balance Sheet */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* LEFT: Estado de Resultados Integral (P&G) */}
            <div className="flex flex-col justify-between rounded-2xl bg-[#2B2B2E] p-4 lg:col-span-6">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-zinc-700 pb-2.5">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white sm:text-base">
                      Estado de Resultados Integral (P&amp;G)
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Ingresos operacionales sin IVA menos costos de producción
                      y gastos del turno.
                    </p>
                  </div>
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#F04E3E]" />
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  {/* INGRESOS */}
                  <div className="font-bold tracking-wider text-zinc-400 uppercase">
                    4.1 Ingresos Operacionales (Base sin IVA)
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      Ventas en Salón (Mesas)
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.revenueDineIn)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      Ventas a Domicilio (Incluye envío)
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.revenueDelivery)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      Ventas en Mostrador (Para Llevar)
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.revenueTakeout)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-zinc-700/80 pt-2 font-bold text-white">
                    <span className="min-w-0 truncate">
                      (=) TOTAL INGRESOS NETOS
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.totalNetRevenue)}
                    </span>
                  </div>

                  {/* COSTO DE VENTAS */}
                  <div className="pt-2 font-bold tracking-wider text-zinc-400 uppercase">
                    5.1 Costo de Producción y Ventas (Consumo Turno)
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      (-) Materia Prima Avícola y Costillar
                    </span>
                    <span className="font-mono-tabular shrink-0 text-[#D99B26]">
                      -{formatUSD(financials.costAvicola)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      (-) Carbón de Roble y Leña Seca
                    </span>
                    <span className="font-mono-tabular shrink-0 text-[#D99B26]">
                      -{formatUSD(financials.costCarbonLena)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      (-) Abarrotes, Papas, Menestra y Bebidas
                    </span>
                    <span className="font-mono-tabular shrink-0 text-[#D99B26]">
                      -{formatUSD(financials.costAbarrotesBebidas)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-zinc-700/80 pt-2 font-bold text-white">
                    <span className="min-w-0 truncate">
                      (=) UTILIDAD BRUTA ({financials.grossMarginPct}%)
                    </span>
                    <span className="font-mono-tabular shrink-0 text-[#4CAF50]">
                      {formatUSD(financials.grossProfit)}
                    </span>
                  </div>

                  {/* GASTOS OPERACIONALES */}
                  <div className="pt-2 font-bold tracking-wider text-zinc-400 uppercase">
                    5.2 Gastos Operacionales y Administrativos
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      (-) Nómina y Beneficios IESS (Prorrateo Turno)
                    </span>
                    <span className="font-mono-tabular shrink-0 text-zinc-200">
                      -{formatUSD(financials.expensePayrollProrated)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      (-) Tarrinas, Contenedores Térmicos y Empaque
                    </span>
                    <span className="font-mono-tabular shrink-0 text-zinc-200">
                      -{formatUSD(financials.expensePackaging)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      (-) Vales y Egresos de Caja Chica
                    </span>
                    <span className="font-mono-tabular shrink-0 text-zinc-200">
                      -{formatUSD(financials.expensePettyCash)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-zinc-700/80 pt-2 font-bold text-white">
                    <span className="min-w-0 truncate">
                      (=) UTILIDAD OPERACIONAL (EBITDA)
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.operatingIncomeEbitda)}
                    </span>
                  </div>

                  {/* PARTICIPACIÓN TRABAJADORES E IMPUESTO RENTA */}
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-400">
                    <span className="min-w-0 truncate">
                      (-) 15% Participación Trabajadores
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      -{formatUSD(financials.workerParticipation15)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-400">
                    <span className="min-w-0 truncate">
                      (-) 25% Impuesto a la Renta Sociedades
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      -{formatUSD(financials.incomeTax25)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#1E1E21] p-3.5 text-xs sm:text-sm font-extrabold text-white">
                <span className="min-w-0 truncate">
                  (=) UTILIDAD NETA DEL EJERCICIO
                </span>
                <span
                  className={`font-mono-tabular shrink-0 text-base ${
                    financials.netIncome >= 0
                      ? 'text-[#4CAF50]'
                      : 'text-[#F04E3E]'
                  }`}
                >
                  {formatUSD(financials.netIncome)}
                </span>
              </div>
            </div>

            {/* RIGHT: Balance General (Estado de Situación Financiera) */}
            <div className="flex flex-col justify-between rounded-2xl bg-[#2B2B2E] p-4 lg:col-span-6">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-zinc-700 pb-2.5">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white sm:text-base">
                      Balance General (Situación Financiera)
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Estructura de Activos, Pasivos y Patrimonio bajo NIIF para
                      PYMES.
                    </p>
                  </div>
                  <Scale className="h-5 w-5 shrink-0 text-[#4CAF50]" />
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  {/* ACTIVOS */}
                  <div className="font-bold tracking-wider text-[#4CAF50] uppercase">
                    1. Activos (Corrientes y Propiedad, Planta y Equipo)
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      1.1.01.01 Caja General y Gaveta POS
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.cashAndDrawer)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      1.1.01.02 Bancos (Pichincha / Guayaquil + Tarjetas)
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.bankAndElectronic)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      1.1.03.01 Inventario de Pollos, Carbón e Insumos
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.inventoryValuation)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      1.1.05.01 Crédito Tributario IVA a Favor
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.taxCreditAsset)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      1.2.01.01 Hornos de Leña, Campanas y Equipos
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.fixedAssetsEquipment)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-zinc-700/80 pt-2 font-bold text-white">
                    <span className="min-w-0 truncate">TOTAL ACTIVOS</span>
                    <span className="font-mono-tabular shrink-0 text-[#4CAF50]">
                      {formatUSD(financials.totalAssets)}
                    </span>
                  </div>

                  {/* PASIVOS */}
                  <div className="pt-2 font-bold tracking-wider text-[#D99B26] uppercase">
                    2. Pasivos (Obligaciones a Corto Plazo)
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      2.1.01.01 Cuentas por Pagar Proveedores
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.accountsPayableSuppliers)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      2.1.04.xx Impuestos y Retenciones por Pagar SRI
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.taxesPayableSri)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      2.1.03.01 Nómina y Aportes IESS por Pagar
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.payrollAndIessPayable)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-zinc-700/80 pt-2 font-bold text-white">
                    <span className="min-w-0 truncate">TOTAL PASIVOS</span>
                    <span className="font-mono-tabular shrink-0 text-[#D99B26]">
                      {formatUSD(financials.totalLiabilities)}
                    </span>
                  </div>

                  {/* PATRIMONIO */}
                  <div className="pt-2 font-bold tracking-wider text-sky-400 uppercase">
                    3. Patrimonio Neto
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      3.1.01.01 Capital Social Suscrito
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.paidInCapital)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      3.2.01.01 Reserva Legal y Resultados Acumulados
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.retainedEarningsAndReserves)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-300">
                    <span className="min-w-0 truncate">
                      3.3.01.01 Utilidad / Resultado del Período Actual
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.currentPeriodNetIncome)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#1E1E21] p-3.5 text-xs sm:text-sm font-extrabold text-white">
                <span className="min-w-0 truncate">
                  TOTAL PASIVO + PATRIMONIO
                </span>
                <span className="font-mono-tabular shrink-0 text-base text-[#4CAF50]">
                  {formatUSD(
                    roundUSD(
                      financials.totalLiabilities + financials.totalEquity
                    )
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Plan de Cuentas NIIF Catalog */}
          <div className="rounded-2xl bg-[#2B2B2E] p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 border-b border-zinc-700 pb-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-bold text-white">
                  Catálogo del Plan de Cuentas NIIF ({CHART_OF_ACCOUNTS.length}{' '}
                  cuentas operativas)
                </h3>
                <p className="text-xs text-zinc-400">
                  Estructura codificada para restaurantes y asaderos obligados a
                  llevar contabilidad en Ecuador.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'todos', label: 'Todas' },
                    { id: 'activo', label: '1. Activos' },
                    { id: 'pasivo', label: '2. Pasivos' },
                    { id: 'patrimonio', label: '3. Patrimonio' },
                    { id: 'ingreso', label: '4. Ingresos' },
                    { id: 'costo', label: '5.1 Costos' },
                    { id: 'gasto', label: '5.2 Gastos' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setAccountGroupFilter(g.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      accountGroupFilter === g.id
                        ? 'bg-[#F04E3E] text-white'
                        : 'bg-[#1E1E21] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {CHART_OF_ACCOUNTS.filter(
                (a) =>
                  accountGroupFilter === 'todos' ||
                  a.group === accountGroupFilter
              ).map((acc) => (
                <div
                  key={acc.code}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#1E1E21] px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono-tabular font-bold text-[#F04E3E]">
                      {acc.code}
                    </span>
                    <p className="truncate font-medium text-zinc-200">
                      {acc.name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 uppercase">
                    {acc.nature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 2: LIBRO DIARIO, MAYOR Y BALANCE DE COMPROBACIÓN NIIF
         ===================================================================== */}
      {activeTab === 'libro_diario' && (
        <div className="space-y-6">
          {/* Sub-Switch: Libro Diario vs Libro Mayor y Balance de Comprobación */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl bg-[#2B2B2E] p-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-bold text-white">
                Registros Contables de Partida Doble
              </h3>
              <p className="text-xs text-zinc-400">
                Alterna entre los asientos cronológicos del Libro Diario y la
                mayorización por cuenta en el Balance de Comprobación.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-full bg-[#18181A] p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setLedgerMode('diario')}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  ledgerMode === 'diario'
                    ? 'bg-[#F04E3E] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Libro Diario ({journalEntries.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerMode('mayor')}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  ledgerMode === 'mayor'
                    ? 'bg-[#F04E3E] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Mayor y Comprobación
              </button>
            </div>
          </div>

          {ledgerMode === 'diario' ? (
            <>
              {/* Manual Entry Registration Form (Clean 4-col responsive grid) */}
              <div className="rounded-2xl bg-[#2B2B2E] p-4 sm:p-5">
                <h3 className="text-base font-bold text-white">
                  Registrar Nuevo Asiento Contable Manual (Partida Doble)
                </h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Las ventas POS, anulaciones, compras y vales de caja generan
                  asientos automáticos. Usa este formulario para ajustes o
                  provisiones.
                </p>

                <form
                  onSubmit={handleCreateManualEntry}
                  className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-[#1E1E21] p-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                  <div>
                    <label
                      htmlFor="je-debit-acc"
                      className="mb-1 block text-xs font-semibold text-zinc-300"
                    >
                      Cuenta al DEBE (+)
                    </label>
                    <select
                      id="je-debit-acc"
                      value={debitAccountCode}
                      onChange={(e) => setDebitAccountCode(e.target.value)}
                      className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3 py-2 text-xs text-white"
                    >
                      {CHART_OF_ACCOUNTS.map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} · {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="je-credit-acc"
                      className="mb-1 block text-xs font-semibold text-zinc-300"
                    >
                      Cuenta al HABER (-)
                    </label>
                    <select
                      id="je-credit-acc"
                      value={creditAccountCode}
                      onChange={(e) => setCreditAccountCode(e.target.value)}
                      className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3 py-2 text-xs text-white"
                    >
                      {CHART_OF_ACCOUNTS.map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} · {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="je-amount"
                      className="mb-1 block text-xs font-semibold text-zinc-300"
                    >
                      Monto ($)
                    </label>
                    <input
                      id="je-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      placeholder="25.00"
                      className="font-mono-tabular w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs font-bold text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="je-ref"
                      className="mb-1 block text-xs font-semibold text-zinc-300"
                    >
                      Documento Ref.
                    </label>
                    <input
                      id="je-ref"
                      type="text"
                      value={manualRef}
                      onChange={(e) => setManualRef(e.target.value)}
                      placeholder="COMP-001"
                      className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2 xl:col-span-3">
                    <input
                      type="text"
                      aria-label="Glosa o concepto del asiento contable"
                      value={manualGloss}
                      onChange={(e) => setManualGloss(e.target.value)}
                      placeholder="Glosa / Concepto (Ej. Pago planilla agua potable y GLP industrial mes actual)"
                      className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2 xl:col-span-1">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#E53935] to-[#F05545] px-4 py-2 text-xs font-bold text-white"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span>Contabilizar Asiento</span>
                    </button>
                  </div>

                  {manualError && (
                    <div className="sm:col-span-2 xl:col-span-4">
                      <p className="text-xs font-semibold text-[#F04E3E]">
                        {manualError}
                      </p>
                    </div>
                  )}
                </form>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col justify-between gap-3 rounded-2xl bg-[#2B2B2E] p-4 xl:flex-row xl:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="search"
                    value={journalSearch}
                    onChange={(e) => setJournalSearch(e.target.value)}
                    placeholder="Buscar asiento por código (ASI-0001), cuenta NIIF (1.1.01), factura o glosa..."
                    className="w-full rounded-full border border-zinc-700 bg-[#18181A] py-2 pr-4 pl-10 text-xs text-white placeholder-zinc-500 focus:border-[#F04E3E] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-[#18181A] p-1">
                  {(
                    [
                      { id: 'todos', label: 'Todos' },
                      { id: 'venta_pos', label: 'Ventas POS' },
                      { id: 'compra_proveedor', label: 'Compras' },
                      { id: 'caja_chica', label: 'Caja Chica' },
                      { id: 'anulacion_nc', label: 'Notas Crédito' },
                      { id: 'manual', label: 'Manuales' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setJournalSourceFilter(f.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
                        journalSourceFilter === f.id
                          ? 'bg-[#F04E3E] font-semibold text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Journal Entries List */}
              <div className="space-y-3">
                {filteredJournal.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl bg-[#242427] p-4 transition-colors hover:bg-[#2B2B2E]"
                  >
                    <div className="flex flex-col justify-between gap-2 border-b border-zinc-700/70 pb-2.5 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tabular rounded-lg bg-[#18181A] px-2.5 py-1 text-xs font-bold text-[#F04E3E]">
                          {entry.entryNumber}
                        </span>
                        {sourceBadge(entry.source)}
                        <span className="font-mono-tabular text-xs font-semibold text-zinc-300">
                          {entry.referenceDoc}
                        </span>
                        <span className="text-xs text-zinc-400">
                          · {entry.date} {entry.time}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-white">
                        {entry.description}
                      </span>
                    </div>

                    {/* Double-Entry Lines Table */}
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[440px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800 text-[11px] text-zinc-400">
                            <th className="pb-1.5 font-semibold">
                              Código NIIF
                            </th>
                            <th className="pb-1.5 font-semibold">
                              Cuenta Contable
                            </th>
                            <th className="pb-1.5 text-right font-semibold">
                              Debe ($)
                            </th>
                            <th className="pb-1.5 text-right font-semibold">
                              Haber ($)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {entry.lines.map((line, idx) => (
                            <tr key={`${entry.id}-${idx}`}>
                              <td className="font-mono-tabular py-1.5 pr-3 font-semibold whitespace-nowrap text-zinc-300">
                                {line.accountCode}
                              </td>
                              <td
                                className={`py-1.5 pr-3 ${
                                  line.credit > 0
                                    ? 'pl-4 text-zinc-300'
                                    : 'font-medium text-white'
                                }`}
                              >
                                {line.accountName}
                              </td>
                              <td className="font-mono-tabular py-1.5 text-right font-semibold whitespace-nowrap text-[#4CAF50]">
                                {line.debit > 0 ? formatUSD(line.debit) : '—'}
                              </td>
                              <td className="font-mono-tabular py-1.5 text-right font-semibold whitespace-nowrap text-sky-400">
                                {line.credit > 0 ? formatUSD(line.credit) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-zinc-700 font-bold text-white">
                            <td colSpan={2} className="pt-2 pr-4 text-right">
                              Sumas Iguales:
                            </td>
                            <td className="font-mono-tabular pt-2 text-right whitespace-nowrap text-[#4CAF50]">
                              {formatUSD(entry.totalDebit)}
                            </td>
                            <td className="font-mono-tabular pt-2 text-right whitespace-nowrap text-sky-400">
                              {formatUSD(entry.totalCredit)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Balance de Comprobación de Sumas y Saldos + Libro Mayor por Cuenta */
            <div className="rounded-2xl bg-[#2B2B2E] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-700 pb-3.5">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Balance de Comprobación de Sumas y Saldos (Libro Mayor)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Haz clic en cualquier cuenta para desplegar sus movimientos
                    individuales y saldo acumulado.
                  </p>
                </div>
                <span className="rounded-full bg-[#4CAF50]/20 px-3 py-1 text-xs font-bold text-[#4CAF50]">
                  Saldos Cuadrados: {formatUSD(trialBalance.totalDebitBalance)}
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {trialBalance.rows.map((row) => {
                  const isExpanded = expandedAccountCode === row.accountCode;
                  return (
                    <div
                      key={row.accountCode}
                      className="overflow-hidden rounded-xl bg-[#1E1E21]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAccountCode(
                            isExpanded ? null : row.accountCode
                          )
                        }
                        className="flex w-full flex-col justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/5 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-[#F04E3E]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                          )}
                          <span className="font-mono-tabular shrink-0 text-xs font-bold text-[#F04E3E]">
                            {row.accountCode}
                          </span>
                          <span className="truncate text-xs font-semibold text-white">
                            {row.accountName}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs sm:flex sm:items-center sm:gap-5">
                          <div className="text-right">
                            <span className="block text-[10px] text-zinc-400">
                              Suma Debe
                            </span>
                            <span className="font-mono-tabular font-semibold text-zinc-200">
                              {formatUSD(row.debitSum)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-zinc-400">
                              Suma Haber
                            </span>
                            <span className="font-mono-tabular font-semibold text-zinc-200">
                              {formatUSD(row.creditSum)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-zinc-400">
                              Saldo Deudor
                            </span>
                            <span className="font-mono-tabular font-bold text-[#4CAF50]">
                              {row.debitBalance > 0
                                ? formatUSD(row.debitBalance)
                                : '—'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-zinc-400">
                              Saldo Acreedor
                            </span>
                            <span className="font-mono-tabular font-bold text-sky-400">
                              {row.creditBalance > 0
                                ? formatUSD(row.creditBalance)
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-zinc-800 bg-[#141416] px-4 py-3 overflow-x-auto">
                          <table className="w-full min-w-[460px] text-left text-xs">
                            <thead>
                              <tr className="border-b border-zinc-800 text-[11px] text-zinc-400">
                                <th className="pb-1.5">Asiento</th>
                                <th className="pb-1.5">Referencia</th>
                                <th className="pb-1.5">Glosa</th>
                                <th className="pb-1.5 text-right">Debe</th>
                                <th className="pb-1.5 text-right">Haber</th>
                                <th className="pb-1.5 text-right">Saldo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60">
                              {row.movements.map((m, idx) => (
                                <tr key={`${row.accountCode}-${idx}`}>
                                  <td className="font-mono-tabular py-1.5 pr-2 font-semibold text-[#F04E3E]">
                                    {m.entryNumber}
                                  </td>
                                  <td className="font-mono-tabular py-1.5 pr-2 text-zinc-300">
                                    {m.referenceDoc}
                                  </td>
                                  <td className="max-w-[220px] truncate py-1.5 pr-2 text-zinc-300">
                                    {m.description}
                                  </td>
                                  <td className="font-mono-tabular py-1.5 text-right text-[#4CAF50]">
                                    {m.debit > 0 ? formatUSD(m.debit) : '—'}
                                  </td>
                                  <td className="font-mono-tabular py-1.5 text-right text-sky-400">
                                    {m.credit > 0 ? formatUSD(m.credit) : '—'}
                                  </td>
                                  <td className="font-mono-tabular py-1.5 text-right font-bold text-white">
                                    {formatUSD(Math.abs(m.runningBalance))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODULE 3: COMPRAS, PROVEEDORES Y RETENCIONES ELECTRÓNICAS
         ===================================================================== */}
      {activeTab === 'compras_retenciones' && (
        <div className="space-y-6">
          {/* New Supplier Invoice & Withholding Form */}
          <div className="rounded-2xl bg-[#2B2B2E] p-4 sm:p-5">
            <h3 className="text-base font-bold text-white">
              Registrar Factura de Compra y Emitir Comprobante de Retención SRI
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Ingresa compras de pollos crudos (tarifa 0%), carbón, bebidas o
              servicios (tarifa 15%). Calcula automáticamente la retención IR y
              de IVA.
            </p>

            <form
              onSubmit={handleCreatePurchase}
              className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-[#1E1E21] p-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div>
                <label
                  htmlFor="pur-sup-name"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  Razón Social del Proveedor
                </label>
                <input
                  id="pur-sup-name"
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Ej. Avícola San Isidro Cía. Ltda."
                  className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="pur-sup-ruc"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  RUC / Cédula Proveedor
                </label>
                <input
                  id="pur-sup-ruc"
                  type="text"
                  maxLength={13}
                  value={supRuc}
                  onChange={(e) =>
                    setSupRuc(e.target.value.replace(/\D/g, ''))
                  }
                  placeholder="1790319857001"
                  className="font-mono-tabular w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="pur-inv-num"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  N° Factura Proveedor
                </label>
                <input
                  id="pur-inv-num"
                  type="text"
                  value={supInvoiceNum}
                  onChange={(e) => setSupInvoiceNum(e.target.value)}
                  className="font-mono-tabular w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="pur-cat"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  Cuenta / Categoría de Costo
                </label>
                <select
                  id="pur-cat"
                  value={supCategory}
                  onChange={(e) =>
                    setSupCategory(e.target.value as PurchaseCategory)
                  }
                  className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3 py-2 text-xs text-white"
                >
                  {Object.entries(PURCHASE_CATEGORY_LABELS).map(
                    ([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="pur-sub0"
                    className="mb-1 block text-xs font-semibold text-zinc-300"
                  >
                    Subtotal 0% ($)
                  </label>
                  <input
                    id="pur-sub0"
                    type="number"
                    step="0.01"
                    min="0"
                    value={supSub0}
                    onChange={(e) => setSupSub0(e.target.value)}
                    className="font-mono-tabular w-full rounded-full border border-zinc-700 bg-[#141416] px-3 py-2 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="pur-sub15"
                    className="mb-1 block text-xs font-semibold text-zinc-300"
                  >
                    Subtotal 15% ($)
                  </label>
                  <input
                    id="pur-sub15"
                    type="number"
                    step="0.01"
                    min="0"
                    value={supSub15}
                    onChange={(e) => setSupSub15(e.target.value)}
                    className="font-mono-tabular w-full rounded-full border border-zinc-700 bg-[#141416] px-3 py-2 text-xs font-bold text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="pur-ir-code"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  Código Retención Renta (Form. 103)
                </label>
                <select
                  id="pur-ir-code"
                  value={supIrCode}
                  onChange={(e) => setSupIrCode(e.target.value)}
                  className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3 py-2 text-xs text-white"
                >
                  {SRI_IR_WITHHOLDING_RULES.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="pur-iva-ret"
                    className="mb-1 block text-xs font-semibold text-zinc-300"
                  >
                    Retención IVA
                  </label>
                  <select
                    id="pur-iva-ret"
                    value={supIvaRetPct}
                    onChange={(e) =>
                      setSupIvaRetPct(
                        Number(e.target.value) as 0 | 30 | 70 | 100
                      )
                    }
                    className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3 py-2 text-xs text-white"
                  >
                    <option value={0}>0% (No aplica)</option>
                    <option value={30}>30% (Bienes)</option>
                    <option value={70}>70% (Servicios)</option>
                    <option value={100}>100% (Liquidación)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="pur-status"
                    className="mb-1 block text-xs font-semibold text-zinc-300"
                  >
                    Estado Pago
                  </label>
                  <select
                    id="pur-status"
                    value={supStatus}
                    onChange={(e) =>
                      setSupStatus(e.target.value as PurchasePaymentStatus)
                    }
                    className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3 py-2 text-xs text-white"
                  >
                    <option value="pagada">Pagada</option>
                    <option value="por_pagar">Por Pagar (C×P)</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="pur-desc"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  Detalle de Bienes o Servicios Adquiridos
                </label>
                <input
                  id="pur-desc"
                  type="text"
                  value={supDesc}
                  onChange={(e) => setSupDesc(e.target.value)}
                  placeholder="Ej. 30 pollos camperos frescos + 5 sacos de carbón"
                  className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs text-white"
                />
              </div>

              {/* Live Tax Preview Bar */}
              <div className="flex flex-col justify-between gap-3 rounded-2xl bg-black/30 p-3 text-xs sm:col-span-2 lg:col-span-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-300">
                  <span>
                    IVA 15%:{' '}
                    <strong className="font-mono-tabular text-white">
                      {formatUSD(previewPurchase.ivaAmount)}
                    </strong>
                  </span>
                  <span>
                    Ret. IR:{' '}
                    <strong className="font-mono-tabular text-amber-400">
                      -{formatUSD(previewPurchase.irWithholdingAmount)}
                    </strong>
                  </span>
                  <span>
                    Ret. IVA:{' '}
                    <strong className="font-mono-tabular text-amber-400">
                      -{formatUSD(previewPurchase.ivaWithholdingAmount)}
                    </strong>
                  </span>
                  <span>
                    Neto a Pagar:{' '}
                    <strong className="font-mono-tabular text-sm text-[#4CAF50]">
                      {formatUSD(previewPurchase.netPayable)}
                    </strong>
                  </span>
                </div>
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#E53935] to-[#F05545] px-5 py-2 text-xs font-bold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Guardar Compra y Retención</span>
                </button>
              </div>

              {purchaseError && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs font-semibold text-[#F04E3E]">
                    {purchaseError}
                  </p>
                </div>
              )}
            </form>
          </div>

          {/* Purchases & Accounts Payable List */}
          <div className="space-y-3">
            {purchases.map((pur) => (
              <div
                key={pur.id}
                className="rounded-2xl bg-[#242427] p-4 transition-colors hover:bg-[#2B2B2E]"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {pur.supplierName}
                      </span>
                      <span className="font-mono-tabular rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-300">
                        RUC {pur.supplierRuc}
                      </span>
                      <span className="font-mono-tabular text-xs font-semibold text-[#F04E3E]">
                        Fact. {pur.invoiceNumber}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-300">
                      {pur.description} ·{' '}
                      <span className="text-zinc-400">
                        {PURCHASE_CATEGORY_LABELS[pur.category]}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {pur.status === 'pagada' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#4CAF50]/20 px-3 py-1 text-xs font-bold text-[#4CAF50]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Pagada ({pur.paymentMethod})
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#D99B26]/20 px-3 py-1 text-xs font-bold text-[#D99B26]">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Por Pagar (C×P)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onMarkPurchasePaid(pur.id, 'transferencia')
                          }
                          className="rounded-full bg-[#4CAF50] px-3 py-1 text-xs font-bold text-white hover:opacity-90"
                        >
                          Pagar por Banco
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3 text-xs sm:grid-cols-3 xl:grid-cols-6">
                  <div>
                    <span className="text-[11px] text-zinc-400">Base 0%</span>
                    <p className="font-mono-tabular font-semibold text-white">
                      {formatUSD(pur.subtotalZero)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">Base 15%</span>
                    <p className="font-mono-tabular font-semibold text-white">
                      {formatUSD(pur.subtotalTaxed)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">IVA 15%</span>
                    <p className="font-mono-tabular font-semibold text-white">
                      {formatUSD(pur.ivaAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Ret. IR ({pur.irWithholdingCode} ·{' '}
                      {pur.irWithholdingPercent}%)
                    </span>
                    <p className="font-mono-tabular font-semibold text-amber-400">
                      -{formatUSD(pur.irWithholdingAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Ret. IVA ({pur.ivaWithholdingPercent}%)
                    </span>
                    <p className="font-mono-tabular font-semibold text-amber-400">
                      -{formatUSD(pur.ivaWithholdingAmount)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[11px] text-zinc-400">
                      Neto a Pagar Proveedor
                    </span>
                    <p className="font-mono-tabular text-sm font-extrabold text-[#4CAF50]">
                      {formatUSD(pur.netPayable)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 4: DECLARACIONES TRIBUTARIAS SRI (FORM 104, FORM 103 & ATS)
         ===================================================================== */}
      {activeTab === 'impuestos_sri' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* LEFT: Formulario 104 (Declaración del IVA) */}
            <div className="flex flex-col justify-between rounded-2xl bg-[#2B2B2E] p-4 sm:p-5 lg:col-span-6">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-zinc-700 pb-3.5">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white">
                      Formulario 104 · Declaración Mensual de IVA
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Liquidación de IVA en ventas 15% frente a crédito
                      tributario por adquisiciones.
                    </p>
                  </div>
                  <Landmark className="h-5 w-5 shrink-0 text-[#F04E3E]" />
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="font-bold tracking-wider text-zinc-400 uppercase">
                    Resumen de Ventas e Ingresos Gravados
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
                    <span className="min-w-0 truncate text-zinc-300">
                      [Casillero 401] Ventas netas gravadas tarifa 15%:
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-white">
                      {formatUSD(sriSummary.salesBase15)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
                    <span className="min-w-0 truncate text-zinc-300">
                      [Casillero 421] IVA generado en ventas 15% (+):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-bold text-amber-400">
                      {formatUSD(sriSummary.salesIva15)}
                    </span>
                  </div>

                  <div className="pt-2 font-bold tracking-wider text-zinc-400 uppercase">
                    Resumen de Adquisiciones y Crédito Tributario
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
                    <span className="min-w-0 truncate text-zinc-300">
                      [Casillero 507] Adquisiciones tarifa 0% (Pollos / Agro):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-white">
                      {formatUSD(sriSummary.purchasesBase0)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
                    <span className="min-w-0 truncate text-zinc-300">
                      [Casillero 500] Adquisiciones gravadas tarifa 15%:
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-white">
                      {formatUSD(sriSummary.purchasesBase15)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
                    <span className="min-w-0 truncate text-zinc-300">
                      [Casillero 520] Crédito Tributario IVA Compras (-):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-bold text-[#4CAF50]">
                      -{formatUSD(sriSummary.purchasesIvaCredit)}
                    </span>
                  </div>

                  <div className="pt-2 font-bold tracking-wider text-zinc-400 uppercase">
                    Liquidación Final de IVA
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
                    <span className="min-w-0 truncate text-zinc-300">
                      [Casillero 601] Impuesto Causado (IVA por Pagar):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-bold text-white">
                      {formatUSD(sriSummary.netIvaPayable)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
                    <span className="min-w-0 truncate text-zinc-300">
                      [Casillero 605] Saldo Crédito Tributario próx. mes:
                    </span>
                    <span className="font-mono-tabular shrink-0 font-bold text-[#4CAF50]">
                      {formatUSD(sriSummary.remainingTaxCredit)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
                    <span className="min-w-0 truncate text-zinc-300">
                      [Casillero 799] Retenciones de IVA practicadas (+):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-bold text-amber-400">
                      {formatUSD(sriSummary.ivaWithheldByUs)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#1E1E21] p-3.5 text-xs sm:text-sm font-extrabold text-white">
                <span className="min-w-0 truncate">
                  TOTAL FORMULARIO 104 A PAGAR
                </span>
                <span className="font-mono-tabular shrink-0 text-base text-[#F04E3E]">
                  {formatUSD(
                    roundUSD(
                      sriSummary.netIvaPayable + sriSummary.ivaWithheldByUs
                    )
                  )}
                </span>
              </div>
            </div>

            {/* RIGHT: Formulario 103 (Retenciones IR) + ATS XML */}
            <div className="flex flex-col justify-between rounded-2xl bg-[#2B2B2E] p-4 sm:p-5 lg:col-span-6">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-zinc-700 pb-3.5">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white">
                      Formulario 103 · Retenciones en la Fuente de IR
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Desglose por concepto y código SRI de retenciones de
                      Impuesto a la Renta.
                    </p>
                  </div>
                  <ArrowDownRight className="h-5 w-5 shrink-0 text-amber-400" />
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                  {sriSummary.irWithheldByCode.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#1E1E21] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {item.label}
                        </p>
                        <p className="font-mono-tabular text-[11px] text-zinc-400">
                          Base Imponible: {formatUSD(item.baseAmount)}
                        </p>
                      </div>
                      <span className="font-mono-tabular shrink-0 text-sm font-bold text-amber-400">
                        {formatUSD(item.withheldAmount)}
                      </span>
                    </div>
                  ))}

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#1E1E21] p-3.5 text-xs sm:text-sm font-extrabold text-white">
                    <span className="min-w-0 truncate">
                      TOTAL FORMULARIO 103 A PAGAR
                    </span>
                    <span className="font-mono-tabular shrink-0 text-base text-amber-400">
                      {formatUSD(sriSummary.totalIrWithheld)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ATS Generator Box */}
              <div className="mt-6 rounded-xl border border-zinc-700 bg-[#1E1E21] p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white">
                      Anexo Transaccional Simplificado (ATS - XML)
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Consolidado de compras, retenciones AIR y ventas POS para
                      el SRI en Línea.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAtsPreview((v) => !v)}
                      className="rounded-full bg-[#38383C] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-600"
                    >
                      {showAtsPreview ? 'Ocultar XML' : 'Ver XML'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadAtsXml}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E53935] to-[#F05545] px-3.5 py-1.5 text-xs font-bold text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Descargar ATS.xml</span>
                    </button>
                  </div>
                </div>

                {showAtsPreview && (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-[#141416] p-3 font-mono text-[11px] text-emerald-400">
                    {atsXmlString}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 5: NÓMINA Y ROL DE PAGOS (IESS / MINISTERIO DEL TRABAJO)
         ===================================================================== */}
      {activeTab === 'nomina_iess' && (
        <div className="space-y-6">
          {/* Add Employee to Payroll Form */}
          <div className="rounded-2xl bg-[#2B2B2E] p-4 sm:p-5">
            <h3 className="text-base font-bold text-white">
              Rol de Pagos Mensual y Provisiones Sociales (IESS Ecuador)
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Cálculo automático de Aporte Personal IESS (9.45%), Aporte
              Patronal (11.15%), Décimo Tercero, Décimo Cuarto (SBU $470) y
              horas suplementarias al 50%.
            </p>

            <form
              onSubmit={handleCreateEmployee}
              className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-[#1E1E21] p-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <div>
                <label
                  htmlFor="emp-name"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  Colaborador (Nombres y Apellidos)
                </label>
                <input
                  id="emp-name"
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="Ej. Luis Alberto Cedeño"
                  className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="emp-cedula"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  Cédula (10 dígitos)
                </label>
                <input
                  id="emp-cedula"
                  type="text"
                  maxLength={10}
                  value={empCedula}
                  onChange={(e) =>
                    setEmpCedula(e.target.value.replace(/\D/g, ''))
                  }
                  placeholder="1712345678"
                  className="font-mono-tabular w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="emp-role"
                  className="mb-1 block text-xs font-semibold text-zinc-300"
                >
                  Cargo en el Asadero
                </label>
                <input
                  id="emp-role"
                  type="text"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label
                    htmlFor="emp-salary"
                    className="mb-1 block text-xs font-semibold text-zinc-300"
                  >
                    Sueldo Base ($)
                  </label>
                  <input
                    id="emp-salary"
                    type="number"
                    min={470}
                    step="10"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    className="font-mono-tabular w-full rounded-full border border-zinc-700 bg-[#141416] px-3.5 py-2 text-xs font-bold text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#E53935] to-[#F05545] px-4 py-2 text-xs font-bold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar</span>
                </button>
              </div>

              {empError && (
                <div className="sm:col-span-2 xl:col-span-4">
                  <p className="text-xs font-semibold text-[#F04E3E]">
                    {empError}
                  </p>
                </div>
              )}
            </form>
          </div>

          {/* Payroll Table */}
          <div className="space-y-3">
            {payroll.map((emp) => (
              <div
                key={emp.id}
                className="rounded-2xl bg-[#242427] p-4 transition-colors hover:bg-[#2B2B2E]"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {emp.name}
                      </span>
                      <span className="font-mono-tabular rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-300">
                        C.I. {emp.cedula}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{emp.role}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAddOvertimeHour(emp.id, 1)}
                      className="rounded-full bg-[#38383C] px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-600"
                    >
                      +1h Extra ({emp.overtimeHours}h)
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePayrollPaid(emp.id)}
                      className={`rounded-full px-3.5 py-1 text-xs font-bold text-white ${
                        emp.paidStatus === 'pagado'
                          ? 'bg-[#4CAF50]'
                          : 'bg-[#D99B26]'
                      }`}
                    >
                      {emp.paidStatus === 'pagado'
                        ? 'Rol Pagado'
                        : 'Pendiente Pago'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3 text-xs sm:grid-cols-3 xl:grid-cols-6">
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Sueldo + H. Extras
                    </span>
                    <p className="font-mono-tabular font-semibold text-white">
                      {formatUSD(emp.baseSalary + emp.overtimeAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      (-) IESS Personal 9.45%
                    </span>
                    <p className="font-mono-tabular font-semibold text-amber-400">
                      -{formatUSD(emp.iessPersonal)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      (+) IESS Patronal 11.15%
                    </span>
                    <p className="font-mono-tabular font-semibold text-zinc-300">
                      {formatUSD(emp.iessEmployer)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Décimo 13° y 14°
                    </span>
                    <p className="font-mono-tabular font-semibold text-zinc-300">
                      {formatUSD(
                        roundUSD(emp.thirteenthSalary + emp.fourteenthSalary)
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Costo Total Empresa
                    </span>
                    <p className="font-mono-tabular font-bold text-white">
                      {formatUSD(emp.totalEmployerCost)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[11px] text-zinc-400">
                      Líquido a Recibir
                    </span>
                    <p className="font-mono-tabular text-sm font-extrabold text-[#4CAF50]">
                      {formatUSD(emp.netTakeHome)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
