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
  const [supPayMethod] = useState<'efectivo' | 'transferencia'>(
    'transferencia'
  );
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
          <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
            Venta POS
          </span>
        );
      case 'anulacion_nc':
        return (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-[#E11D2E]">
            Nota Crédito
          </span>
        );
      case 'compra_proveedor':
        return (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-700">
            Compra / Ret.
          </span>
        );
      case 'caja_chica':
        return (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
            Caja Chica
          </span>
        );
      case 'manual':
        return (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
            Asiento Manual
          </span>
        );
    }
  };

  return (
    <div className="@container space-y-5 text-zinc-900">
      {/* Header & Sub-module Navigation Card */}
      <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 shrink-0 text-[#E11D2E]" />
              <h2 className="truncate text-lg font-extrabold text-zinc-900 sm:text-xl">
                Contabilidad General NIIF &amp; Tributación SRI
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              <span className="font-bold text-[#E11D2E]">
                {BUSINESS_INFO.legalName} · RUC {BUSINESS_INFO.ruc}
              </span>{' '}
              · Obligado a llevar contabilidad · Integración en vivo con POS y
              Caja
            </p>
          </div>

          <div className="flex shrink-0 items-center">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Partida Doble Cuadrada ({journalEntries.length} asientos)
            </span>
          </div>
        </div>

        {/* Sub-module Responsive Grid Navigation Bar */}
        <div
          role="tablist"
          aria-label="Módulos de contabilidad"
          className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-[#F4F5F9] p-1.5 sm:grid-cols-3 lg:grid-cols-5"
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
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition-all xl:gap-2 xl:px-3 xl:text-xs ${
                  idx === 4 ? 'col-span-2 sm:col-span-1' : ''
                } ${
                  isActive
                    ? 'bg-[#111318] text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-white hover:text-zinc-900'
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 xl:h-4 xl:w-4 ${
                    isActive ? 'text-[#E11D2E]' : ''
                  }`}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MODULE 1: ESTADOS FINANCIEROS (P&G + BALANCE GENERAL + PLAN CUENTAS)
         ===================================================================== */}
      {activeTab === 'estados_financieros' && (
        <div className="space-y-4">
          {/* Top 4 Executive Financial KPIs */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex min-w-0 flex-col justify-between rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-zinc-400">
                  Ingresos Netos (Sin IVA)
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-600" />
              </div>
              <p className="font-mono-tabular mt-1 truncate text-xl font-extrabold text-zinc-900 xl:text-2xl">
                {formatUSD(financials.totalNetRevenue)}
              </p>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                Facturado Bruto: {formatUSD(sriSummary.grossSalesTotal)} (Inc.
                IVA)
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-zinc-400">
                  Utilidad Bruta Ventas
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Margen {financials.grossMarginPct}%
                </span>
              </div>
              <p className="font-mono-tabular mt-1 truncate text-xl font-extrabold text-zinc-900 xl:text-2xl">
                {formatUSD(financials.grossProfit)}
              </p>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                Costo de Ventas: -{formatUSD(financials.totalCostOfSales)}
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-zinc-400">
                  Utilidad Neta Período
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    financials.netIncome >= 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-[#E11D2E]'
                  }`}
                >
                  Neto {financials.netMarginPct}%
                </span>
              </div>
              <p
                className={`font-mono-tabular mt-1 truncate text-xl font-extrabold xl:text-2xl ${
                  financials.netIncome >= 0
                    ? 'text-emerald-600'
                    : 'text-[#E11D2E]'
                }`}
              >
                {formatUSD(financials.netIncome)}
              </p>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                Post 15% Trab. y 25% Imp. Renta
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-bold text-emerald-700">
                  Ecuación Patrimonial NIIF
                </span>
                <Scale className="h-4 w-4 shrink-0 text-emerald-700" />
              </div>
              <p className="font-mono-tabular mt-1 truncate text-xl font-extrabold text-zinc-900 xl:text-2xl">
                {formatUSD(financials.totalAssets)}
              </p>
              <span className="font-mono-tabular mt-0.5 block truncate text-[11px] text-emerald-700">
                Pasivo {formatUSD(financials.totalLiabilities)} + Patrim.{' '}
                {formatUSD(financials.totalEquity)}
              </span>
            </div>
          </div>

          {/* Main 2-Column Financial Statements: P&L + Balance Sheet */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* LEFT: Estado de Resultados Integral (P&G) */}
            <div className="flex flex-col justify-between rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] lg:col-span-6">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-dashed border-zinc-200 pb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-zinc-900 sm:text-base">
                      Estado de Resultados Integral (P&amp;G)
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Ingresos operacionales sin IVA menos costos de producción
                      y gastos del turno.
                    </p>
                  </div>
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#E11D2E]" />
                </div>

                <div className="mt-3.5 space-y-2 text-xs">
                  <div className="font-extrabold tracking-wider text-zinc-400 uppercase">
                    4.1 Ingresos Operacionales (Base sin IVA)
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      Ventas en Salón (Mesas)
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.revenueDineIn)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      Ventas a Domicilio (Incluye envío)
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.revenueDelivery)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      Ventas en Mostrador (Para Llevar)
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.revenueTakeout)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-zinc-200 pt-2 font-extrabold text-zinc-900">
                    <span className="min-w-0 truncate">
                      (=) TOTAL INGRESOS NETOS
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.totalNetRevenue)}
                    </span>
                  </div>

                  <div className="pt-2 font-extrabold tracking-wider text-zinc-400 uppercase">
                    5.1 Costo de Producción y Ventas (Consumo Turno)
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      (-) Materia Prima Avícola y Costillar
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-amber-600">
                      -{formatUSD(financials.costAvicola)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      (-) Carbón de Roble y Leña Seca
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-amber-600">
                      -{formatUSD(financials.costCarbonLena)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      (-) Abarrotes, Papas, Menestra y Bebidas
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-amber-600">
                      -{formatUSD(financials.costAbarrotesBebidas)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-zinc-200 pt-2 font-extrabold text-zinc-900">
                    <span className="min-w-0 truncate">
                      (=) UTILIDAD BRUTA ({financials.grossMarginPct}%)
                    </span>
                    <span className="font-mono-tabular shrink-0 text-emerald-600">
                      {formatUSD(financials.grossProfit)}
                    </span>
                  </div>

                  <div className="pt-2 font-extrabold tracking-wider text-zinc-400 uppercase">
                    5.2 Gastos Operacionales y Administrativos
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      (-) Nómina y Beneficios IESS (Prorrateo Turno)
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-800">
                      -{formatUSD(financials.expensePayrollProrated)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      (-) Tarrinas, Contenedores Térmicos y Empaque
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-800">
                      -{formatUSD(financials.expensePackaging)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      (-) Vales y Egresos de Caja Chica
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-800">
                      -{formatUSD(financials.expensePettyCash)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-zinc-200 pt-2 font-extrabold text-zinc-900">
                    <span className="min-w-0 truncate">
                      (=) UTILIDAD OPERACIONAL (EBITDA)
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      {formatUSD(financials.operatingIncomeEbitda)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-500">
                    <span className="min-w-0 truncate">
                      (-) 15% Participación Trabajadores
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      -{formatUSD(financials.workerParticipation15)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-500">
                    <span className="min-w-0 truncate">
                      (-) 25% Impuesto a la Renta Sociedades
                    </span>
                    <span className="font-mono-tabular shrink-0">
                      -{formatUSD(financials.incomeTax25)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#111318] p-3.5 text-xs sm:text-sm font-extrabold text-white">
                <span className="min-w-0 truncate">
                  (=) UTILIDAD NETA DEL EJERCICIO
                </span>
                <span
                  className={`font-mono-tabular shrink-0 text-base ${
                    financials.netIncome >= 0
                      ? 'text-emerald-400'
                      : 'text-[#F04E3E]'
                  }`}
                >
                  {formatUSD(financials.netIncome)}
                </span>
              </div>
            </div>

            {/* RIGHT: Balance General (Estado de Situación Financiera) */}
            <div className="flex flex-col justify-between rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] lg:col-span-6">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-dashed border-zinc-200 pb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-zinc-900 sm:text-base">
                      Balance General (Situación Financiera)
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Estructura de Activos, Pasivos y Patrimonio bajo NIIF para
                      PYMES.
                    </p>
                  </div>
                  <Scale className="h-5 w-5 shrink-0 text-emerald-600" />
                </div>

                <div className="mt-3.5 space-y-2 text-xs">
                  <div className="font-extrabold tracking-wider text-emerald-700 uppercase">
                    1. Activos (Corrientes y Propiedad, Planta y Equipo)
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      1.1.01.01 Caja General y Gaveta POS
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.cashAndDrawer)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      1.1.01.02 Bancos (Pichincha / Guayaquil + Tarjetas)
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.bankAndElectronic)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      1.1.03.01 Inventario de Pollos, Carbón e Insumos
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.inventoryValuation)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      1.1.05.01 Crédito Tributario IVA a Favor
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.taxCreditAsset)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      1.2.01.01 Hornos de Leña, Campanas y Equipos
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.fixedAssetsEquipment)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-zinc-200 pt-2 font-extrabold text-zinc-900">
                    <span className="min-w-0 truncate">TOTAL ACTIVOS</span>
                    <span className="font-mono-tabular shrink-0 text-emerald-600">
                      {formatUSD(financials.totalAssets)}
                    </span>
                  </div>

                  <div className="pt-2 font-extrabold tracking-wider text-amber-600 uppercase">
                    2. Pasivos (Obligaciones a Corto Plazo)
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      2.1.01.01 Cuentas por Pagar Proveedores
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.accountsPayableSuppliers)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      2.1.04.xx Impuestos y Retenciones por Pagar SRI
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.taxesPayableSri)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      2.1.03.01 Nómina y Aportes IESS por Pagar
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.payrollAndIessPayable)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-zinc-200 pt-2 font-extrabold text-zinc-900">
                    <span className="min-w-0 truncate">TOTAL PASIVOS</span>
                    <span className="font-mono-tabular shrink-0 text-amber-600">
                      {formatUSD(financials.totalLiabilities)}
                    </span>
                  </div>

                  <div className="pt-2 font-extrabold tracking-wider text-sky-600 uppercase">
                    3. Patrimonio Neto
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      3.1.01.01 Capital Social Suscrito
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.paidInCapital)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      3.2.01.01 Reserva Legal y Resultados Acumulados
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.retainedEarningsAndReserves)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pl-2 sm:pl-3 text-zinc-600">
                    <span className="min-w-0 truncate">
                      3.3.01.01 Utilidad / Resultado del Período Actual
                    </span>
                    <span className="font-mono-tabular shrink-0 font-semibold text-zinc-900">
                      {formatUSD(financials.currentPeriodNetIncome)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#111318] p-3.5 text-xs sm:text-sm font-extrabold text-white">
                <span className="min-w-0 truncate">
                  TOTAL PASIVO + PATRIMONIO
                </span>
                <span className="font-mono-tabular shrink-0 text-base text-emerald-400">
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
          <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
            <div className="flex flex-col justify-between gap-3 border-b border-dashed border-zinc-200 pb-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-extrabold text-zinc-900">
                  Catálogo del Plan de Cuentas NIIF ({CHART_OF_ACCOUNTS.length}{' '}
                  cuentas operativas)
                </h3>
                <p className="text-xs text-zinc-500">
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
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      accountGroupFilter === g.id
                        ? 'bg-[#111318] text-white'
                        : 'bg-[#F4F5F9] text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {CHART_OF_ACCOUNTS.filter(
                (a) =>
                  accountGroupFilter === 'todos' ||
                  a.group === accountGroupFilter
              ).map((acc) => (
                <div
                  key={acc.code}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono-tabular font-extrabold text-[#E11D2E]">
                      {acc.code}
                    </span>
                    <p className="truncate font-bold text-zinc-800">
                      {acc.name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-200/70 px-2 py-0.5 text-[10px] font-bold text-zinc-600 uppercase">
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
        <div className="space-y-5">
          {/* Sub-Switch: Libro Diario vs Libro Mayor y Balance de Comprobación */}
          <div className="flex flex-col justify-between gap-3 rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900">
                Registros Contables de Partida Doble
              </h3>
              <p className="text-xs text-zinc-500">
                Alterna entre los asientos cronológicos del Libro Diario y la
                mayorización por cuenta en el Balance de Comprobación.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-full bg-[#F4F5F9] p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setLedgerMode('diario')}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  ledgerMode === 'diario'
                    ? 'bg-[#111318] text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Libro Diario ({journalEntries.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerMode('mayor')}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  ledgerMode === 'mayor'
                    ? 'bg-[#111318] text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Mayor y Comprobación
              </button>
            </div>
          </div>

          {ledgerMode === 'diario' ? (
            <>
              {/* Manual Entry Registration Form */}
              <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
                <h3 className="text-base font-extrabold text-zinc-900">
                  Registrar Nuevo Asiento Contable Manual (Partida Doble)
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Las ventas POS, anulaciones, compras y vales de caja generan
                  asientos automáticos. Usa este formulario para ajustes o
                  provisiones.
                </p>

                <form
                  onSubmit={handleCreateManualEntry}
                  className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] p-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                  <div>
                    <label
                      htmlFor="je-debit-acc"
                      className="mb-1 block text-xs font-bold text-zinc-600"
                    >
                      Cuenta al DEBE (+)
                    </label>
                    <select
                      id="je-debit-acc"
                      value={debitAccountCode}
                      onChange={(e) => setDebitAccountCode(e.target.value)}
                      className="w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900"
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
                      className="mb-1 block text-xs font-bold text-zinc-600"
                    >
                      Cuenta al HABER (-)
                    </label>
                    <select
                      id="je-credit-acc"
                      value={creditAccountCode}
                      onChange={(e) => setCreditAccountCode(e.target.value)}
                      className="w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900"
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
                      className="mb-1 block text-xs font-bold text-zinc-600"
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
                      className="font-mono-tabular w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-extrabold text-zinc-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="je-ref"
                      className="mb-1 block text-xs font-bold text-zinc-600"
                    >
                      Documento Ref.
                    </label>
                    <input
                      id="je-ref"
                      type="text"
                      value={manualRef}
                      onChange={(e) => setManualRef(e.target.value)}
                      placeholder="COMP-001"
                      className="w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900"
                    />
                  </div>

                  <div className="sm:col-span-2 xl:col-span-3">
                    <input
                      type="text"
                      aria-label="Glosa o concepto del asiento contable"
                      value={manualGloss}
                      onChange={(e) => setManualGloss(e.target.value)}
                      placeholder="Glosa / Concepto (Ej. Pago planilla agua potable y GLP industrial mes actual)"
                      className="w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900"
                    />
                  </div>

                  <div className="sm:col-span-2 xl:col-span-1">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#111318] px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span>Contabilizar Asiento</span>
                    </button>
                  </div>

                  {manualError && (
                    <div className="sm:col-span-2 xl:col-span-4">
                      <p className="text-xs font-bold text-[#E11D2E]">
                        {manualError}
                      </p>
                    </div>
                  )}
                </form>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col justify-between gap-3 rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)] xl:flex-row xl:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="search"
                    value={journalSearch}
                    onChange={(e) => setJournalSearch(e.target.value)}
                    placeholder="Buscar asiento por código (ASI-0001), cuenta NIIF (1.1.01), factura o glosa..."
                    className="w-full rounded-full border border-zinc-200 bg-[#F8F9FC] py-2 pr-4 pl-10 text-xs text-zinc-900 placeholder-zinc-400 focus:border-[#E11D2E] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-[#F4F5F9] p-1">
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
                      className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
                        journalSourceFilter === f.id
                          ? 'bg-[#111318] text-white'
                          : 'text-zinc-500 hover:text-zinc-900'
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
                    className="rounded-[22px] bg-white p-4 sm:p-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex flex-col justify-between gap-2 border-b border-dashed border-zinc-200 pb-2.5 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tabular rounded-lg bg-[#111318] px-2.5 py-1 text-xs font-extrabold text-white">
                          {entry.entryNumber}
                        </span>
                        {sourceBadge(entry.source)}
                        <span className="font-mono-tabular text-xs font-bold text-zinc-700">
                          {entry.referenceDoc}
                        </span>
                        <span className="text-xs text-zinc-400">
                          · {entry.date} {entry.time}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-zinc-800">
                        {entry.description}
                      </span>
                    </div>

                    {/* Double-Entry Lines Table */}
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[440px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 text-[11px] text-zinc-400">
                            <th className="pb-1.5 font-bold">Código NIIF</th>
                            <th className="pb-1.5 font-bold">
                              Cuenta Contable
                            </th>
                            <th className="pb-1.5 text-right font-bold">
                              Debe ($)
                            </th>
                            <th className="pb-1.5 text-right font-bold">
                              Haber ($)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dashed divide-zinc-200">
                          {entry.lines.map((line, idx) => (
                            <tr key={`${entry.id}-${idx}`}>
                              <td className="font-mono-tabular py-2 pr-3 font-bold whitespace-nowrap text-[#E11D2E]">
                                {line.accountCode}
                              </td>
                              <td
                                className={`py-2 pr-3 ${
                                  line.credit > 0
                                    ? 'pl-4 text-zinc-500'
                                    : 'font-bold text-zinc-900'
                                }`}
                              >
                                {line.accountName}
                              </td>
                              <td className="font-mono-tabular py-2 text-right font-bold whitespace-nowrap text-emerald-600">
                                {line.debit > 0 ? formatUSD(line.debit) : '—'}
                              </td>
                              <td className="font-mono-tabular py-2 text-right font-bold whitespace-nowrap text-sky-600">
                                {line.credit > 0 ? formatUSD(line.credit) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-zinc-200 font-extrabold text-zinc-900">
                            <td colSpan={2} className="pt-2 pr-4 text-right">
                              Sumas Iguales:
                            </td>
                            <td className="font-mono-tabular pt-2 text-right whitespace-nowrap text-emerald-600">
                              {formatUSD(entry.totalDebit)}
                            </td>
                            <td className="font-mono-tabular pt-2 text-right whitespace-nowrap text-sky-600">
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
            <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-zinc-200 pb-3.5">
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Balance de Comprobación de Sumas y Saldos (Libro Mayor)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Haz clic en cualquier cuenta para desplegar sus movimientos
                    individuales y saldo acumulado.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Saldos Cuadrados: {formatUSD(trialBalance.totalDebitBalance)}
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {trialBalance.rows.map((row) => {
                  const isExpanded = expandedAccountCode === row.accountCode;
                  return (
                    <div
                      key={row.accountCode}
                      className="overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAccountCode(
                            isExpanded ? null : row.accountCode
                          )
                        }
                        className="flex w-full flex-col justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-zinc-100/80 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-[#E11D2E]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                          )}
                          <span className="font-mono-tabular shrink-0 text-xs font-extrabold text-[#E11D2E]">
                            {row.accountCode}
                          </span>
                          <span className="truncate text-xs font-bold text-zinc-900">
                            {row.accountName}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs sm:flex sm:items-center sm:gap-5">
                          <div className="text-right">
                            <span className="block text-[10px] text-zinc-400">
                              Suma Debe
                            </span>
                            <span className="font-mono-tabular font-bold text-zinc-700">
                              {formatUSD(row.debitSum)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-zinc-400">
                              Suma Haber
                            </span>
                            <span className="font-mono-tabular font-bold text-zinc-700">
                              {formatUSD(row.creditSum)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-zinc-400">
                              Saldo Deudor
                            </span>
                            <span className="font-mono-tabular font-extrabold text-emerald-600">
                              {row.debitBalance > 0
                                ? formatUSD(row.debitBalance)
                                : '—'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-zinc-400">
                              Saldo Acreedor
                            </span>
                            <span className="font-mono-tabular font-extrabold text-sky-600">
                              {row.creditBalance > 0
                                ? formatUSD(row.creditBalance)
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="overflow-x-auto border-t border-dashed border-zinc-200 bg-white px-4 py-3">
                          <table className="w-full min-w-[460px] text-left text-xs">
                            <thead>
                              <tr className="border-b border-zinc-200 text-[11px] text-zinc-400">
                                <th className="pb-1.5">Asiento</th>
                                <th className="pb-1.5">Referencia</th>
                                <th className="pb-1.5">Glosa</th>
                                <th className="pb-1.5 text-right">Debe</th>
                                <th className="pb-1.5 text-right">Haber</th>
                                <th className="pb-1.5 text-right">Saldo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-dashed divide-zinc-200">
                              {row.movements.map((m, idx) => (
                                <tr key={`${row.accountCode}-${idx}`}>
                                  <td className="font-mono-tabular py-1.5 pr-2 font-bold text-[#E11D2E]">
                                    {m.entryNumber}
                                  </td>
                                  <td className="font-mono-tabular py-1.5 pr-2 text-zinc-700">
                                    {m.referenceDoc}
                                  </td>
                                  <td className="max-w-[220px] truncate py-1.5 pr-2 text-zinc-600">
                                    {m.description}
                                  </td>
                                  <td className="font-mono-tabular py-1.5 text-right font-bold text-emerald-600">
                                    {m.debit > 0 ? formatUSD(m.debit) : '—'}
                                  </td>
                                  <td className="font-mono-tabular py-1.5 text-right font-bold text-sky-600">
                                    {m.credit > 0 ? formatUSD(m.credit) : '—'}
                                  </td>
                                  <td className="font-mono-tabular py-1.5 text-right font-extrabold text-zinc-900">
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
        <div className="space-y-5">
          {/* New Supplier Invoice & Withholding Form */}
          <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
            <h3 className="text-base font-extrabold text-zinc-900">
              Registrar Factura de Compra y Emitir Comprobante de Retención SRI
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Ingresa compras de pollos crudos (tarifa 0%), carbón, bebidas o
              servicios (tarifa 15%). Calcula automáticamente la retención IR y
              de IVA.
            </p>

            <form
              onSubmit={handleCreatePurchase}
              className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] p-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div>
                <label
                  htmlFor="pur-sup-name"
                  className="mb-1 block text-xs font-bold text-zinc-600"
                >
                  Razón Social del Proveedor
                </label>
                <input
                  id="pur-sup-name"
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Ej. Avícola San Isidro Cía. Ltda."
                  className="w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label
                  htmlFor="pur-sup-ruc"
                  className="mb-1 block text-xs font-bold text-zinc-600"
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
                  className="font-mono-tabular w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label
                  htmlFor="pur-inv-num"
                  className="mb-1 block text-xs font-bold text-zinc-600"
                >
                  N° Factura Proveedor
                </label>
                <input
                  id="pur-inv-num"
                  type="text"
                  value={supInvoiceNum}
                  onChange={(e) => setSupInvoiceNum(e.target.value)}
                  className="font-mono-tabular w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label
                  htmlFor="pur-cat"
                  className="mb-1 block text-xs font-bold text-zinc-600"
                >
                  Cuenta / Categoría de Costo
                </label>
                <select
                  id="pur-cat"
                  value={supCategory}
                  onChange={(e) =>
                    setSupCategory(e.target.value as PurchaseCategory)
                  }
                  className="w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
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
                    className="mb-1 block text-xs font-bold text-zinc-600"
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
                    className="font-mono-tabular w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-extrabold text-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="pur-sub15"
                    className="mb-1 block text-xs font-bold text-zinc-600"
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
                    className="font-mono-tabular w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-extrabold text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="pur-ir-code"
                  className="mb-1 block text-xs font-bold text-zinc-600"
                >
                  Código Retención Renta (Form. 103)
                </label>
                <select
                  id="pur-ir-code"
                  value={supIrCode}
                  onChange={(e) => setSupIrCode(e.target.value)}
                  className="w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
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
                    className="mb-1 block text-xs font-bold text-zinc-600"
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
                    className="w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
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
                    className="mb-1 block text-xs font-bold text-zinc-600"
                  >
                    Estado Pago
                  </label>
                  <select
                    id="pur-status"
                    value={supStatus}
                    onChange={(e) =>
                      setSupStatus(e.target.value as PurchasePaymentStatus)
                    }
                    className="w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
                  >
                    <option value="pagada">Pagada</option>
                    <option value="por_pagar">Por Pagar (C×P)</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="pur-desc"
                  className="mb-1 block text-xs font-bold text-zinc-600"
                >
                  Detalle de Bienes o Servicios Adquiridos
                </label>
                <input
                  id="pur-desc"
                  type="text"
                  value={supDesc}
                  onChange={(e) => setSupDesc(e.target.value)}
                  placeholder="Ej. 30 pollos camperos frescos + 5 sacos de carbón"
                  className="w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900"
                />
              </div>

              {/* Live Tax Preview Bar */}
              <div className="flex flex-col justify-between gap-3 rounded-2xl bg-white p-3.5 text-xs shadow-2xs ring-1 ring-zinc-200/80 sm:col-span-2 lg:col-span-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-600">
                  <span>
                    IVA 15%:{' '}
                    <strong className="font-mono-tabular text-zinc-900">
                      {formatUSD(previewPurchase.ivaAmount)}
                    </strong>
                  </span>
                  <span>
                    Ret. IR:{' '}
                    <strong className="font-mono-tabular text-amber-600">
                      -{formatUSD(previewPurchase.irWithholdingAmount)}
                    </strong>
                  </span>
                  <span>
                    Ret. IVA:{' '}
                    <strong className="font-mono-tabular text-amber-600">
                      -{formatUSD(previewPurchase.ivaWithholdingAmount)}
                    </strong>
                  </span>
                  <span>
                    Neto a Pagar:{' '}
                    <strong className="font-mono-tabular text-sm font-extrabold text-emerald-600">
                      {formatUSD(previewPurchase.netPayable)}
                    </strong>
                  </span>
                </div>
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#111318] px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Guardar Compra y Retención</span>
                </button>
              </div>

              {purchaseError && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs font-bold text-[#E11D2E]">
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
                className="rounded-[22px] bg-white p-4 sm:p-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)]"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-zinc-900">
                        {pur.supplierName}
                      </span>
                      <span className="font-mono-tabular rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600">
                        RUC {pur.supplierRuc}
                      </span>
                      <span className="font-mono-tabular text-xs font-bold text-[#E11D2E]">
                        Fact. {pur.invoiceNumber}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">
                      {pur.description} ·{' '}
                      <span className="text-zinc-400">
                        {PURCHASE_CATEGORY_LABELS[pur.category]}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {pur.status === 'pagada' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Pagada ({pur.paymentMethod})
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Por Pagar (C×P)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onMarkPurchasePaid(pur.id, 'transferencia')
                          }
                          className="rounded-full bg-[#111318] px-3 py-1 text-xs font-bold text-white hover:bg-zinc-800"
                        >
                          Pagar por Banco
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-dashed border-zinc-200 pt-3 text-xs sm:grid-cols-3 xl:grid-cols-6">
                  <div>
                    <span className="text-[11px] text-zinc-400">Base 0%</span>
                    <p className="font-mono-tabular font-bold text-zinc-900">
                      {formatUSD(pur.subtotalZero)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">Base 15%</span>
                    <p className="font-mono-tabular font-bold text-zinc-900">
                      {formatUSD(pur.subtotalTaxed)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">IVA 15%</span>
                    <p className="font-mono-tabular font-bold text-zinc-900">
                      {formatUSD(pur.ivaAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Ret. IR ({pur.irWithholdingCode} ·{' '}
                      {pur.irWithholdingPercent}%)
                    </span>
                    <p className="font-mono-tabular font-bold text-amber-600">
                      -{formatUSD(pur.irWithholdingAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Ret. IVA ({pur.ivaWithholdingPercent}%)
                    </span>
                    <p className="font-mono-tabular font-bold text-amber-600">
                      -{formatUSD(pur.ivaWithholdingAmount)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[11px] text-zinc-400">
                      Neto a Pagar Proveedor
                    </span>
                    <p className="font-mono-tabular text-sm font-extrabold text-emerald-600">
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
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* LEFT: Formulario 104 (Declaración del IVA) */}
            <div className="flex flex-col justify-between rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] lg:col-span-6">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-dashed border-zinc-200 pb-3.5">
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-zinc-900">
                      Formulario 104 · Declaración Mensual de IVA
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Liquidación de IVA en ventas 15% frente a crédito
                      tributario por adquisiciones.
                    </p>
                  </div>
                  <Landmark className="h-5 w-5 shrink-0 text-[#E11D2E]" />
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="font-extrabold tracking-wider text-zinc-400 uppercase">
                    Resumen de Ventas e Ingresos Gravados
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-zinc-200 pb-2">
                    <span className="min-w-0 truncate text-zinc-600">
                      [Casillero 401] Ventas netas gravadas tarifa 15%:
                    </span>
                    <span className="font-mono-tabular shrink-0 font-bold text-zinc-900">
                      {formatUSD(sriSummary.salesBase15)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-zinc-200 pb-2">
                    <span className="min-w-0 truncate text-zinc-600">
                      [Casillero 421] IVA generado en ventas 15% (+):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-extrabold text-amber-600">
                      {formatUSD(sriSummary.salesIva15)}
                    </span>
                  </div>

                  <div className="pt-2 font-extrabold tracking-wider text-zinc-400 uppercase">
                    Resumen de Adquisiciones y Crédito Tributario
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-zinc-200 pb-2">
                    <span className="min-w-0 truncate text-zinc-600">
                      [Casillero 507] Adquisiciones tarifa 0% (Pollos / Agro):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-bold text-zinc-900">
                      {formatUSD(sriSummary.purchasesBase0)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-zinc-200 pb-2">
                    <span className="min-w-0 truncate text-zinc-600">
                      [Casillero 500] Adquisiciones gravadas tarifa 15%:
                    </span>
                    <span className="font-mono-tabular shrink-0 font-bold text-zinc-900">
                      {formatUSD(sriSummary.purchasesBase15)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-zinc-200 pb-2">
                    <span className="min-w-0 truncate text-zinc-600">
                      [Casillero 520] Crédito Tributario IVA Compras (-):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-extrabold text-emerald-600">
                      -{formatUSD(sriSummary.purchasesIvaCredit)}
                    </span>
                  </div>

                  <div className="pt-2 font-extrabold tracking-wider text-zinc-400 uppercase">
                    Liquidación Final de IVA
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-zinc-200 pb-2">
                    <span className="min-w-0 truncate text-zinc-600">
                      [Casillero 601] Impuesto Causado (IVA por Pagar):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-extrabold text-zinc-900">
                      {formatUSD(sriSummary.netIvaPayable)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-zinc-200 pb-2">
                    <span className="min-w-0 truncate text-zinc-600">
                      [Casillero 605] Saldo Crédito Tributario próx. mes:
                    </span>
                    <span className="font-mono-tabular shrink-0 font-extrabold text-emerald-600">
                      {formatUSD(sriSummary.remainingTaxCredit)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-zinc-200 pb-2">
                    <span className="min-w-0 truncate text-zinc-600">
                      [Casillero 799] Retenciones de IVA practicadas (+):
                    </span>
                    <span className="font-mono-tabular shrink-0 font-extrabold text-amber-600">
                      {formatUSD(sriSummary.ivaWithheldByUs)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#111318] p-3.5 text-xs sm:text-sm font-extrabold text-white">
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
            <div className="flex flex-col justify-between rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] lg:col-span-6">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-dashed border-zinc-200 pb-3.5">
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-zinc-900">
                      Formulario 103 · Retenciones en la Fuente de IR
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Desglose por concepto y código SRI de retenciones de
                      Impuesto a la Renta.
                    </p>
                  </div>
                  <ArrowDownRight className="h-5 w-5 shrink-0 text-amber-600" />
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                  {sriSummary.irWithheldByCode.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-zinc-900">
                          {item.label}
                        </p>
                        <p className="font-mono-tabular text-[11px] text-zinc-500">
                          Base Imponible: {formatUSD(item.baseAmount)}
                        </p>
                      </div>
                      <span className="font-mono-tabular shrink-0 text-sm font-extrabold text-amber-600">
                        {formatUSD(item.withheldAmount)}
                      </span>
                    </div>
                  ))}

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#111318] p-3.5 text-xs sm:text-sm font-extrabold text-white">
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
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-zinc-900">
                      Anexo Transaccional Simplificado (ATS - XML)
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Consolidado de compras, retenciones AIR y ventas POS para
                      el SRI en Línea.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAtsPreview((v) => !v)}
                      className="rounded-full bg-zinc-200/80 px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-300"
                    >
                      {showAtsPreview ? 'Ocultar XML' : 'Ver XML'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadAtsXml}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#E11D2E] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#C81625]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Descargar ATS.xml</span>
                    </button>
                  </div>
                </div>

                {showAtsPreview && (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-[#111318] p-3 font-mono text-[11px] text-emerald-400">
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
        <div className="space-y-5">
          {/* Add Employee to Payroll Form */}
          <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
            <h3 className="text-base font-extrabold text-zinc-900">
              Rol de Pagos Mensual y Provisiones Sociales (IESS Ecuador)
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Cálculo automático de Aporte Personal IESS (9.45%), Aporte
              Patronal (11.15%), Décimo Tercero, Décimo Cuarto (SBU $470) y
              horas suplementarias al 50%.
            </p>

            <form
              onSubmit={handleCreateEmployee}
              className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-dashed border-zinc-200 bg-[#FAFBFD] p-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <div>
                <label
                  htmlFor="emp-name"
                  className="mb-1 block text-xs font-bold text-zinc-600"
                >
                  Colaborador (Nombres y Apellidos)
                </label>
                <input
                  id="emp-name"
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="Ej. Luis Alberto Cedeño"
                  className="w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label
                  htmlFor="emp-cedula"
                  className="mb-1 block text-xs font-bold text-zinc-600"
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
                  className="font-mono-tabular w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label
                  htmlFor="emp-role"
                  className="mb-1 block text-xs font-bold text-zinc-600"
                >
                  Cargo en el Asadero
                </label>
                <input
                  id="emp-role"
                  type="text"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label
                    htmlFor="emp-salary"
                    className="mb-1 block text-xs font-bold text-zinc-600"
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
                    className="font-mono-tabular w-full rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-extrabold text-zinc-900"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#111318] px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar</span>
                </button>
              </div>

              {empError && (
                <div className="sm:col-span-2 xl:col-span-4">
                  <p className="text-xs font-bold text-[#E11D2E]">
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
                className="rounded-[22px] bg-white p-4 sm:p-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)]"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-zinc-900">
                        {emp.name}
                      </span>
                      <span className="font-mono-tabular rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600">
                        C.I. {emp.cedula}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{emp.role}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAddOvertimeHour(emp.id, 1)}
                      className="rounded-full bg-[#F4F5F9] px-3 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-200"
                    >
                      +1h Extra ({emp.overtimeHours}h)
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePayrollPaid(emp.id)}
                      className={`rounded-full px-3.5 py-1 text-xs font-bold text-white ${
                        emp.paidStatus === 'pagado'
                          ? 'bg-emerald-600'
                          : 'bg-amber-500'
                      }`}
                    >
                      {emp.paidStatus === 'pagado'
                        ? 'Rol Pagado'
                        : 'Pendiente Pago'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-dashed border-zinc-200 pt-3 text-xs sm:grid-cols-3 xl:grid-cols-6">
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Sueldo + H. Extras
                    </span>
                    <p className="font-mono-tabular font-bold text-zinc-900">
                      {formatUSD(emp.baseSalary + emp.overtimeAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      (-) IESS Personal 9.45%
                    </span>
                    <p className="font-mono-tabular font-bold text-amber-600">
                      -{formatUSD(emp.iessPersonal)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      (+) IESS Patronal 11.15%
                    </span>
                    <p className="font-mono-tabular font-bold text-zinc-700">
                      {formatUSD(emp.iessEmployer)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Décimo 13° y 14°
                    </span>
                    <p className="font-mono-tabular font-bold text-zinc-700">
                      {formatUSD(
                        roundUSD(emp.thirteenthSalary + emp.fourteenthSalary)
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400">
                      Costo Total Empresa
                    </span>
                    <p className="font-mono-tabular font-extrabold text-zinc-900">
                      {formatUSD(emp.totalEmployerCost)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[11px] text-zinc-400">
                      Líquido a Recibir
                    </span>
                    <p className="font-mono-tabular text-sm font-extrabold text-emerald-600">
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
