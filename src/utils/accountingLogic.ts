import {
  InvoiceRecord,
  CashExpense,
  roundUSD,
  IVA_RATE,
  formatDateEC,
} from './asaderoLogic';

export type AccountingSubModule =
  | 'estados_financieros'
  | 'libro_diario'
  | 'compras_retenciones'
  | 'impuestos_sri'
  | 'nomina_iess';

export type AccountGroup =
  | 'activo'
  | 'pasivo'
  | 'patrimonio'
  | 'ingreso'
  | 'costo'
  | 'gasto';

export interface ChartAccount {
  code: string;
  name: string;
  group: AccountGroup;
  nature: 'deudora' | 'acreedora';
  level: 'grupo' | 'subcuenta' | 'movimiento';
}

export type PurchaseCategory =
  | 'materia_prima_avicola'
  | 'carbon_lena'
  | 'abarrotes_bebidas'
  | 'suministros_empaque'
  | 'servicios_basicos'
  | 'arriendo_local';

export type PurchasePaymentStatus = 'pagada' | 'por_pagar';

export interface SriWithholdingRule {
  code: string;
  label: string;
  ratePercent: number;
}

export interface PurchaseRecord {
  id: string;
  invoiceNumber: string;
  authorizationKey: string;
  issuedDate: string;
  supplierName: string;
  supplierRuc: string;
  category: PurchaseCategory;
  description: string;
  /** Subtotal tarifa 0% (ej. pollo crudo, productos agrícolas sin procesar) */
  subtotalZero: number;
  /** Subtotal tarifa 15% (ej. envases, gaseosas, servicios gravados) */
  subtotalTaxed: number;
  ivaAmount: number;
  totalInvoice: number;
  /** Código SRI Retención IR (ej. 312 = 1.75%, 3440 = 2.75%, 320 = 8%) */
  irWithholdingCode: string;
  irWithholdingPercent: number;
  irWithholdingAmount: number;
  /** Retención de IVA (0%, 30% bienes, 70% servicios, 100% liquidación) */
  ivaWithholdingPercent: 0 | 30 | 70 | 100;
  ivaWithholdingAmount: number;
  netPayable: number;
  status: PurchasePaymentStatus;
  paymentMethod: 'efectivo' | 'transferencia';
}

export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  time: string;
  source: 'venta_pos' | 'anulacion_nc' | 'compra_proveedor' | 'caja_chica' | 'manual';
  referenceDoc: string;
  description: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
}

export interface EmployeePayrollItem {
  id: string;
  name: string;
  cedula: string;
  role: string;
  baseSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  /** Aporte Personal IESS 9.45% */
  iessPersonal: number;
  /** Aporte Patronal IESS 11.15% (gasto empleador) */
  iessEmployer: number;
  /** Provisión Décimo Tercero (1/12) */
  thirteenthSalary: number;
  /** Provisión Décimo Cuarto ($470 / 12 = $39.17) */
  fourteenthSalary: number;
  netTakeHome: number;
  totalEmployerCost: number;
  paidStatus: 'pagado' | 'pendiente';
}

export const SRI_IR_WITHHOLDING_RULES: SriWithholdingRule[] = [
  {
    code: '312',
    label: '312 · Transferencia de bienes muebles de naturaleza corporal (1.75%)',
    ratePercent: 1.75,
  },
  {
    code: '310',
    label: '310 · Adquisición de bienes de origen agrícola / avícola (1.00%)',
    ratePercent: 1.0,
  },
  {
    code: '3440',
    label: '3440 · Otras retenciones aplicables el 2.75% (Servicios generales)',
    ratePercent: 2.75,
  },
  {
    code: '320',
    label: '320 · Arrendamiento de bienes inmuebles (8.00%)',
    ratePercent: 8.0,
  },
  {
    code: '332',
    label: '332 · Pagos de bienes o servicios no sujetos a retención (0.00%)',
    ratePercent: 0,
  },
];

export const PURCHASE_CATEGORY_LABELS: Record<PurchaseCategory, string> = {
  materia_prima_avicola: 'Materia Prima Avícola (Pollo y Carnes)',
  carbon_lena: 'Carbón de Roble y Leña',
  abarrotes_bebidas: 'Abarrotes, Papas, Aceite y Bebidas',
  suministros_empaque: 'Tarrinas, Fundas Térmicas y Empaques',
  servicios_basicos: 'Servicios Básicos, Gas Industrial e Internet',
  arriendo_local: 'Arriendo de Local Comercial',
};

export const CHART_OF_ACCOUNTS: ChartAccount[] = [
  // ACTIVOS
  { code: '1.1.01.01', name: 'Caja General y Gaveta POS', group: 'activo', nature: 'deudora', level: 'movimiento' },
  { code: '1.1.01.02', name: 'Bancos · Pichincha / Guayaquil (Tarjetas y Transf.)', group: 'activo', nature: 'deudora', level: 'movimiento' },
  { code: '1.1.02.01', name: 'Cuentas por Cobrar Clientes', group: 'activo', nature: 'deudora', level: 'movimiento' },
  { code: '1.1.03.01', name: 'Inventario de Pollos, Insumos y Bebidas', group: 'activo', nature: 'deudora', level: 'movimiento' },
  { code: '1.1.05.01', name: 'Crédito Tributario a Favor de la Empresa (IVA Compras)', group: 'activo', nature: 'deudora', level: 'movimiento' },
  { code: '1.2.01.01', name: 'Hornos Asadores de Leña, Campanas y Mobiliario (Neto)', group: 'activo', nature: 'deudora', level: 'movimiento' },

  // PASIVOS
  { code: '2.1.01.01', name: 'Cuentas por Pagar Proveedores', group: 'pasivo', nature: 'acreedora', level: 'movimiento' },
  { code: '2.1.03.01', name: 'Aportes IESS y Beneficios Sociales por Pagar', group: 'pasivo', nature: 'acreedora', level: 'movimiento' },
  { code: '2.1.04.01', name: 'IVA en Ventas (15%) por Pagar al SRI', group: 'pasivo', nature: 'acreedora', level: 'movimiento' },
  { code: '2.1.04.02', name: 'Retenciones en la Fuente IR por Pagar (Form. 103)', group: 'pasivo', nature: 'acreedora', level: 'movimiento' },
  { code: '2.1.04.03', name: 'Retenciones de IVA por Pagar (Form. 104)', group: 'pasivo', nature: 'acreedora', level: 'movimiento' },

  // PATRIMONIO
  { code: '3.1.01.01', name: 'Capital Social Suscrito (Brasa & Roble Cía. Ltda.)', group: 'patrimonio', nature: 'acreedora', level: 'movimiento' },
  { code: '3.2.01.01', name: 'Reserva Legal Acumulada', group: 'patrimonio', nature: 'acreedora', level: 'movimiento' },
  { code: '3.3.01.01', name: 'Resultado del Ejercicio (Utilidad / Pérdida)', group: 'patrimonio', nature: 'acreedora', level: 'movimiento' },

  // INGRESOS
  { code: '4.1.01.01', name: 'Ventas de Pollos Asados, Combos y Bebidas (Tarifa 15%)', group: 'ingreso', nature: 'acreedora', level: 'movimiento' },
  { code: '4.1.01.02', name: 'Ingresos por Servicio de Domicilio (Tarifa 15%)', group: 'ingreso', nature: 'acreedora', level: 'movimiento' },

  // COSTOS DE VENTA
  { code: '5.1.01.01', name: 'Costo de Materia Prima Avícola y Carnes', group: 'costo', nature: 'deudora', level: 'movimiento' },
  { code: '5.1.01.02', name: 'Costo de Carbón de Roble y Leña Seca', group: 'costo', nature: 'deudora', level: 'movimiento' },
  { code: '5.1.01.03', name: 'Costo de Abarrotes, Guarniciones y Bebidas', group: 'costo', nature: 'deudora', level: 'movimiento' },

  // GASTOS OPERACIONALES
  { code: '5.2.01.01', name: 'Sueldos, Salarios y Beneficios Sociales (IESS)', group: 'gasto', nature: 'deudora', level: 'movimiento' },
  { code: '5.2.02.01', name: 'Empaques, Tarrinas y Suministros de Despacho', group: 'gasto', nature: 'deudora', level: 'movimiento' },
  { code: '5.2.02.02', name: 'Servicios Básicos, GLP Industrial e Internet', group: 'gasto', nature: 'deudora', level: 'movimiento' },
  { code: '5.2.02.03', name: 'Arriendo de Local Comercial', group: 'gasto', nature: 'deudora', level: 'movimiento' },
  { code: '5.2.02.04', name: 'Gastos Menores de Caja Chica y Transporte', group: 'gasto', nature: 'deudora', level: 'movimiento' },
];

const TODAY_STR = formatDateEC(new Date());

export function createPurchaseRecord(params: {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierRuc: string;
  category: PurchaseCategory;
  description: string;
  subtotalZero: number;
  subtotalTaxed: number;
  irWithholdingCode: string;
  ivaWithholdingPercent: 0 | 30 | 70 | 100;
  status: PurchasePaymentStatus;
  paymentMethod: 'efectivo' | 'transferencia';
  issuedDate?: string;
}): PurchaseRecord {
  const rule =
    SRI_IR_WITHHOLDING_RULES.find((r) => r.code === params.irWithholdingCode) ??
    SRI_IR_WITHHOLDING_RULES[0];
  const sub0 = roundUSD(Math.max(0, params.subtotalZero));
  const sub15 = roundUSD(Math.max(0, params.subtotalTaxed));
  const ivaAmount = roundUSD(sub15 * IVA_RATE);
  const totalInvoice = roundUSD(sub0 + sub15 + ivaAmount);

  const irBase = roundUSD(sub0 + sub15);
  const irWithholdingAmount = roundUSD(irBase * (rule.ratePercent / 100));
  const ivaWithholdingAmount = roundUSD(
    ivaAmount * (params.ivaWithholdingPercent / 100)
  );
  const netPayable = roundUSD(
    totalInvoice - irWithholdingAmount - ivaWithholdingAmount
  );

  return {
    id: params.id,
    invoiceNumber: params.invoiceNumber,
    authorizationKey: `1011202601${params.supplierRuc}20010010000${String(
      Math.floor(10000 + Math.random() * 89999)
    )}1`,
    issuedDate: params.issuedDate ?? TODAY_STR,
    supplierName: params.supplierName,
    supplierRuc: params.supplierRuc,
    category: params.category,
    description: params.description,
    subtotalZero: sub0,
    subtotalTaxed: sub15,
    ivaAmount,
    totalInvoice,
    irWithholdingCode: rule.code,
    irWithholdingPercent: rule.ratePercent,
    irWithholdingAmount,
    ivaWithholdingPercent: params.ivaWithholdingPercent,
    ivaWithholdingAmount,
    netPayable,
    status: params.status,
    paymentMethod: params.paymentMethod,
  };
}

export const INITIAL_PURCHASES: PurchaseRecord[] = [
  createPurchaseRecord({
    id: 'pur-1',
    invoiceNumber: '002-001-000048912',
    supplierName: 'PRONACA · Procesadora Nacional de Alimentos C.A.',
    supplierRuc: '1790319857001',
    category: 'materia_prima_avicola',
    description: 'Lote 45 pollos camperos frescos (2.1 kg prom.) + costillar de cerdo',
    subtotalZero: 215.0,
    subtotalTaxed: 0,
    irWithholdingCode: '310',
    ivaWithholdingPercent: 0,
    status: 'pagada',
    paymentMethod: 'transferencia',
  }),
  createPurchaseRecord({
    id: 'pur-2',
    invoiceNumber: '001-002-000012304',
    supplierName: 'Carbonera Forestal El Roble Cía. Ltda.',
    supplierRuc: '1792451092001',
    category: 'carbon_lena',
    description: '15 sacos de carbón de roble seleccionado y leña seca de eucalipto',
    subtotalZero: 45.0,
    subtotalTaxed: 30.0,
    irWithholdingCode: '312',
    ivaWithholdingPercent: 30,
    status: 'pagada',
    paymentMethod: 'efectivo',
  }),
  createPurchaseRecord({
    id: 'pur-3',
    invoiceNumber: '004-010-000198430',
    supplierName: 'Arca Continental · Bebidas y Abarrotes del Norte S.A.',
    supplierRuc: '1791284756001',
    category: 'abarrotes_bebidas',
    description: 'Papas chola, aceite vegetal 20L, arroz envejecido y 6 jabas de colas 1.5L',
    subtotalZero: 38.0,
    subtotalTaxed: 64.0,
    irWithholdingCode: '312',
    ivaWithholdingPercent: 30,
    status: 'por_pagar',
    paymentMethod: 'transferencia',
  }),
  createPurchaseRecord({
    id: 'pur-4',
    invoiceNumber: '001-001-000008710',
    supplierName: 'Plásticos y Empaques Biodegradables EcoPack S.A.',
    supplierRuc: '1792837465001',
    category: 'suministros_empaque',
    description: '500 contenedores térmicos para pollo entero, tarrinas de ají 8oz y cubiertos',
    subtotalZero: 0,
    subtotalTaxed: 42.0,
    irWithholdingCode: '312',
    ivaWithholdingPercent: 30,
    status: 'por_pagar',
    paymentMethod: 'transferencia',
  }),
];

export function buildEmployeePayrollItem(params: {
  id: string;
  name: string;
  cedula: string;
  role: string;
  baseSalary: number;
  overtimeHours: number;
  paidStatus: 'pagado' | 'pendiente';
}): EmployeePayrollItem {
  const hourlyRate = params.baseSalary / 240;
  const overtimeAmount = roundUSD(params.overtimeHours * hourlyRate * 1.5);
  const totalEarned = roundUSD(params.baseSalary + overtimeAmount);
  const iessPersonal = roundUSD(totalEarned * 0.0945);
  const iessEmployer = roundUSD(totalEarned * 0.1115);
  const thirteenthSalary = roundUSD(totalEarned / 12);
  const fourteenthSalary = roundUSD(470 / 12);
  const netTakeHome = roundUSD(totalEarned - iessPersonal);
  const totalEmployerCost = roundUSD(
    totalEarned + iessEmployer + thirteenthSalary + fourteenthSalary
  );

  return {
    ...params,
    overtimeAmount,
    iessPersonal,
    iessEmployer,
    thirteenthSalary,
    fourteenthSalary,
    netTakeHome,
    totalEmployerCost,
  };
}

export const INITIAL_PAYROLL: EmployeePayrollItem[] = [
  buildEmployeePayrollItem({
    id: 'emp-1',
    name: 'Carlos Eduardo Quishpe',
    cedula: '1714829104',
    role: 'Maestro Hornero / Asador Principal',
    baseSalary: 620,
    overtimeHours: 8,
    paidStatus: 'pagado',
  }),
  buildEmployeePayrollItem({
    id: 'emp-2',
    name: 'Andrés Sebastián Villacís',
    cedula: '1721948302',
    role: 'Cajero POS & Facturación SRI',
    baseSalary: 510,
    overtimeHours: 4,
    paidStatus: 'pagado',
  }),
  buildEmployeePayrollItem({
    id: 'emp-3',
    name: 'Rosa Elena Tandazo',
    cedula: '1718392045',
    role: 'Jefa de Cocina y Guarniciones',
    baseSalary: 520,
    overtimeHours: 6,
    paidStatus: 'pendiente',
  }),
  buildEmployeePayrollItem({
    id: 'emp-4',
    name: 'Diego Fernando Morales',
    cedula: '1725483910',
    role: 'Atención en Salón y Despacho Domicilio',
    baseSalary: 470,
    overtimeHours: 5,
    paidStatus: 'pendiente',
  }),
];

function getPurchaseDebitAccount(cat: PurchaseCategory): {
  code: string;
  name: string;
} {
  switch (cat) {
    case 'materia_prima_avicola':
      return {
        code: '5.1.01.01',
        name: 'Costo de Materia Prima Avícola y Carnes',
      };
    case 'carbon_lena':
      return {
        code: '5.1.01.02',
        name: 'Costo de Carbón de Roble y Leña Seca',
      };
    case 'abarrotes_bebidas':
      return {
        code: '5.1.01.03',
        name: 'Costo de Abarrotes, Guarniciones y Bebidas',
      };
    case 'suministros_empaque':
      return {
        code: '5.2.02.01',
        name: 'Empaques, Tarrinas y Suministros de Despacho',
      };
    case 'servicios_basicos':
      return {
        code: '5.2.02.02',
        name: 'Servicios Básicos, GLP Industrial e Internet',
      };
    case 'arriendo_local':
      return {
        code: '5.2.02.03',
        name: 'Arriendo de Local Comercial',
      };
  }
}

/**
 * Generates the complete double-entry General Journal (Libro Diario NIIF)
 * combining POS invoices, credit notes, supplier purchases, petty cash expenses, and manual entries.
 */
export function generateJournalEntries(
  invoices: InvoiceRecord[],
  purchases: PurchaseRecord[],
  expenses: CashExpense[],
  manualEntries: JournalEntry[]
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  let seq = 1;
  const nextCode = () => `ASI-${String(seq++).padStart(4, '0')}`;

  // 1. Entries from POS Invoices
  for (const inv of [...invoices].reverse()) {
    const assetAccount =
      inv.paymentMethod === 'efectivo'
        ? { code: '1.1.01.01', name: 'Caja General y Gaveta POS' }
        : {
            code: '1.1.01.02',
            name: 'Bancos · Pichincha / Guayaquil (Tarjetas y Transf.)',
          };

    const lines: JournalEntryLine[] = [
      {
        accountCode: assetAccount.code,
        accountName: assetAccount.name,
        debit: inv.totals.grandTotal,
        credit: 0,
      },
      {
        accountCode: '4.1.01.01',
        accountName: 'Ventas de Pollos Asados, Combos y Bebidas (Tarifa 15%)',
        debit: 0,
        credit: inv.totals.netBase,
      },
      {
        accountCode: '2.1.04.01',
        accountName: 'IVA en Ventas (15%) por Pagar al SRI',
        debit: 0,
        credit: inv.totals.ivaTax,
      },
    ];

    entries.push({
      id: `je-inv-${inv.id}`,
      entryNumber: nextCode(),
      date: inv.issuedDate,
      time: inv.createdAt,
      source: 'venta_pos',
      referenceDoc: `FACT ${inv.folio}`,
      description: `Venta POS a ${inv.customerName} (${inv.paymentMethod.toUpperCase()})`,
      lines,
      totalDebit: inv.totals.grandTotal,
      totalCredit: roundUSD(inv.totals.netBase + inv.totals.ivaTax),
    });

    // If cancelled, generate reversing Credit Note entry
    if (inv.status === 'anulada') {
      const revLines: JournalEntryLine[] = [
        {
          accountCode: '4.1.01.01',
          accountName: 'Ventas de Pollos Asados, Combos y Bebidas (Tarifa 15%)',
          debit: inv.totals.netBase,
          credit: 0,
        },
        {
          accountCode: '2.1.04.01',
          accountName: 'IVA en Ventas (15%) por Pagar al SRI',
          debit: inv.totals.ivaTax,
          credit: 0,
        },
        {
          accountCode: assetAccount.code,
          accountName: assetAccount.name,
          debit: 0,
          credit: inv.totals.grandTotal,
        },
      ];
      entries.push({
        id: `je-rev-${inv.id}`,
        entryNumber: nextCode(),
        date: inv.issuedDate,
        time: inv.createdAt,
        source: 'anulacion_nc',
        referenceDoc: `NC / ANUL ${inv.folio}`,
        description: `Reverso por anulación de factura ${inv.folio}: ${
          inv.cancellationReason ?? 'Nota de crédito'
        }`,
        lines: revLines,
        totalDebit: inv.totals.grandTotal,
        totalCredit: inv.totals.grandTotal,
      });
    }
  }

  // 2. Entries from Supplier Purchases
  for (const pur of purchases) {
    const costAcc = getPurchaseDebitAccount(pur.category);
    const baseCost = roundUSD(pur.subtotalZero + pur.subtotalTaxed);
    const lines: JournalEntryLine[] = [
      {
        accountCode: costAcc.code,
        accountName: costAcc.name,
        debit: baseCost,
        credit: 0,
      },
    ];

    if (pur.ivaAmount > 0) {
      lines.push({
        accountCode: '1.1.05.01',
        accountName: 'Crédito Tributario a Favor de la Empresa (IVA Compras)',
        debit: pur.ivaAmount,
        credit: 0,
      });
    }

    if (pur.irWithholdingAmount > 0) {
      lines.push({
        accountCode: '2.1.04.02',
        accountName: `Retenciones en la Fuente IR por Pagar (Cód. ${pur.irWithholdingCode})`,
        debit: 0,
        credit: pur.irWithholdingAmount,
      });
    }

    if (pur.ivaWithholdingAmount > 0) {
      lines.push({
        accountCode: '2.1.04.03',
        accountName: `Retenciones de IVA por Pagar (${pur.ivaWithholdingPercent}%)`,
        debit: 0,
        credit: pur.ivaWithholdingAmount,
      });
    }

    const creditAccount =
      pur.status === 'por_pagar'
        ? { code: '2.1.01.01', name: 'Cuentas por Pagar Proveedores' }
        : pur.paymentMethod === 'efectivo'
        ? { code: '1.1.01.01', name: 'Caja General y Gaveta POS' }
        : {
            code: '1.1.01.02',
            name: 'Bancos · Pichincha / Guayaquil (Tarjetas y Transf.)',
          };

    lines.push({
      accountCode: creditAccount.code,
      accountName: creditAccount.name,
      debit: 0,
      credit: pur.netPayable,
    });

    const totalDebit = roundUSD(lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = roundUSD(lines.reduce((s, l) => s + l.credit, 0));

    entries.push({
      id: `je-pur-${pur.id}`,
      entryNumber: nextCode(),
      date: pur.issuedDate,
      time: '09:30',
      source: 'compra_proveedor',
      referenceDoc: `COMP ${pur.invoiceNumber}`,
      description: `Compra a ${pur.supplierName} · ${pur.description}`,
      lines,
      totalDebit,
      totalCredit,
    });
  }

  // 3. Entries from Petty Cash Expenses
  for (const exp of expenses) {
    entries.push({
      id: `je-exp-${exp.id}`,
      entryNumber: nextCode(),
      date: TODAY_STR,
      time: exp.time,
      source: 'caja_chica',
      referenceDoc: `VALE-${exp.id.slice(-4).toUpperCase()}`,
      description: `Egreso Caja Chica: ${exp.concept} (${exp.supplierOrAuth})`,
      lines: [
        {
          accountCode: '5.2.02.04',
          accountName: 'Gastos Menores de Caja Chica y Transporte',
          debit: exp.amount,
          credit: 0,
        },
        {
          accountCode: '1.1.01.01',
          accountName: 'Caja General y Gaveta POS',
          debit: 0,
          credit: exp.amount,
        },
      ],
      totalDebit: exp.amount,
      totalCredit: exp.amount,
    });
  }

  // 4. Manual Entries
  for (const man of manualEntries) {
    entries.push({
      ...man,
      entryNumber: nextCode(),
    });
  }

  return entries.reverse();
}

export interface SriTaxSummary {
  activeInvoicesCount: number;
  cancelledInvoicesCount: number;
  salesBase15: number;
  salesIva15: number;
  grossSalesTotal: number;
  purchasesBase0: number;
  purchasesBase15: number;
  purchasesIvaCredit: number;
  ivaWithheldByUs: number;
  /** IVA Ventas - Crédito Tributario IVA Compras */
  netIvaPayable: number;
  /** Crédito tributario a favor si Compras IVA > Ventas IVA */
  remainingTaxCredit: number;
  irWithheldByCode: {
    code: string;
    label: string;
    baseAmount: number;
    withheldAmount: number;
  }[];
  totalIrWithheld: number;
  /** Total a pagar al SRI en el período (IVA Neto + Ret. IVA + Ret. IR) */
  totalSriPayable: number;
}

export function calculateSriTaxSummary(
  invoices: InvoiceRecord[],
  purchases: PurchaseRecord[]
): SriTaxSummary {
  const activeInvoices = invoices.filter((i) => i.status === 'emitida');
  const cancelledInvoices = invoices.filter((i) => i.status === 'anulada');

  const salesBase15 = roundUSD(
    activeInvoices.reduce((s, i) => s + i.totals.netBase, 0)
  );
  const salesIva15 = roundUSD(
    activeInvoices.reduce((s, i) => s + i.totals.ivaTax, 0)
  );
  const grossSalesTotal = roundUSD(
    activeInvoices.reduce((s, i) => s + i.totals.grandTotal, 0)
  );

  const purchasesBase0 = roundUSD(
    purchases.reduce((s, p) => s + p.subtotalZero, 0)
  );
  const purchasesBase15 = roundUSD(
    purchases.reduce((s, p) => s + p.subtotalTaxed, 0)
  );
  const purchasesIvaCredit = roundUSD(
    purchases.reduce((s, p) => s + p.ivaAmount, 0)
  );
  const ivaWithheldByUs = roundUSD(
    purchases.reduce((s, p) => s + p.ivaWithholdingAmount, 0)
  );

  const rawIvaDiff = roundUSD(salesIva15 - purchasesIvaCredit);
  const netIvaPayable = rawIvaDiff > 0 ? rawIvaDiff : 0;
  const remainingTaxCredit = rawIvaDiff < 0 ? Math.abs(rawIvaDiff) : 0;

  const byCodeMap = new Map<
    string,
    { code: string; label: string; baseAmount: number; withheldAmount: number }
  >();
  for (const p of purchases) {
    const rule =
      SRI_IR_WITHHOLDING_RULES.find((r) => r.code === p.irWithholdingCode) ??
      SRI_IR_WITHHOLDING_RULES[0];
    const current = byCodeMap.get(rule.code) ?? {
      code: rule.code,
      label: rule.label,
      baseAmount: 0,
      withheldAmount: 0,
    };
    current.baseAmount = roundUSD(
      current.baseAmount + p.subtotalZero + p.subtotalTaxed
    );
    current.withheldAmount = roundUSD(
      current.withheldAmount + p.irWithholdingAmount
    );
    byCodeMap.set(rule.code, current);
  }

  const irWithheldByCode = Array.from(byCodeMap.values());
  const totalIrWithheld = roundUSD(
    irWithheldByCode.reduce((s, item) => s + item.withheldAmount, 0)
  );

  const totalSriPayable = roundUSD(
    netIvaPayable + ivaWithheldByUs + totalIrWithheld
  );

  return {
    activeInvoicesCount: activeInvoices.length,
    cancelledInvoicesCount: cancelledInvoices.length,
    salesBase15,
    salesIva15,
    grossSalesTotal,
    purchasesBase0,
    purchasesBase15,
    purchasesIvaCredit,
    ivaWithheldByUs,
    netIvaPayable,
    remainingTaxCredit,
    irWithheldByCode,
    totalIrWithheld,
    totalSriPayable,
  };
}

export interface FinancialStatements {
  // Income Statement (P&G)
  revenueDineIn: number;
  revenueDelivery: number;
  revenueTakeout: number;
  totalNetRevenue: number;
  costAvicola: number;
  costCarbonLena: number;
  costAbarrotesBebidas: number;
  totalCostOfSales: number;
  grossProfit: number;
  grossMarginPct: number;
  expensePackaging: number;
  expenseUtilitiesAndRent: number;
  expensePettyCash: number;
  expensePayrollProrated: number;
  totalOperatingExpenses: number;
  operatingIncomeEbitda: number;
  workerParticipation15: number;
  incomeTax25: number;
  netIncome: number;
  netMarginPct: number;

  // Balance Sheet (Estado de Situación Financiera)
  cashAndDrawer: number;
  bankAndElectronic: number;
  inventoryValuation: number;
  taxCreditAsset: number;
  fixedAssetsEquipment: number;
  totalAssets: number;

  accountsPayableSuppliers: number;
  taxesPayableSri: number;
  payrollAndIessPayable: number;
  totalLiabilities: number;

  paidInCapital: number;
  retainedEarningsAndReserves: number;
  currentPeriodNetIncome: number;
  totalEquity: number;
}

export function calculateFinancialStatements(params: {
  invoices: InvoiceRecord[];
  purchases: PurchaseRecord[];
  expenses: CashExpense[];
  payroll: EmployeePayrollItem[];
  openingCash: number;
}): FinancialStatements {
  const activeInvoices = params.invoices.filter((i) => i.status === 'emitida');

  const sumNetByChannel = (ch: 'mesa' | 'domicilio' | 'mostrador') =>
    roundUSD(
      activeInvoices
        .filter((i) => i.channel === ch)
        .reduce((s, i) => s + i.totals.netBase, 0)
    );

  const revenueDineIn = sumNetByChannel('mesa');
  const revenueDelivery = sumNetByChannel('domicilio');
  const revenueTakeout = sumNetByChannel('mostrador');
  const totalNetRevenue = roundUSD(
    activeInvoices.reduce((s, i) => s + i.totals.netBase, 0)
  );

  const sumPurchasesByCat = (cat: PurchaseCategory) =>
    roundUSD(
      params.purchases
        .filter((p) => p.category === cat)
        .reduce((s, p) => s + p.subtotalZero + p.subtotalTaxed, 0)
    );

  // Operational cost recognition (shift consumption proportional to sold portions & inventory batches)
  const costAvicola = roundUSD(
    totalNetRevenue * 0.24 + sumPurchasesByCat('materia_prima_avicola') * 0.02
  );
  const costCarbonLena = roundUSD(
    totalNetRevenue * 0.05 + sumPurchasesByCat('carbon_lena') * 0.02
  );
  const costAbarrotesBebidas = roundUSD(
    totalNetRevenue * 0.07 + sumPurchasesByCat('abarrotes_bebidas') * 0.02
  );
  const totalCostOfSales = roundUSD(
    costAvicola + costCarbonLena + costAbarrotesBebidas
  );

  const grossProfit = roundUSD(totalNetRevenue - totalCostOfSales);
  const grossMarginPct =
    totalNetRevenue > 0
      ? roundUSD((grossProfit / totalNetRevenue) * 100)
      : 0;

  const expensePackaging = roundUSD(
    totalNetRevenue * 0.03 + sumPurchasesByCat('suministros_empaque') * 0.02
  );
  const expenseUtilitiesAndRent = roundUSD(
    (sumPurchasesByCat('servicios_basicos') +
      sumPurchasesByCat('arriendo_local')) *
      0.05
  );
  const expensePettyCash = roundUSD(
    params.expenses.reduce((s, e) => s + e.amount, 0)
  );

  // Shift prorated payroll
  const monthlyPayrollTotal = params.payroll.reduce(
    (s, emp) => s + emp.totalEmployerCost,
    0
  );
  const expensePayrollProrated = roundUSD(monthlyPayrollTotal / 320);

  const totalOperatingExpenses = roundUSD(
    expensePackaging +
      expenseUtilitiesAndRent +
      expensePettyCash +
      expensePayrollProrated
  );

  const operatingIncomeEbitda = roundUSD(grossProfit - totalOperatingExpenses);
  const workerParticipation15 =
    operatingIncomeEbitda > 0 ? roundUSD(operatingIncomeEbitda * 0.15) : 0;
  const taxableAfterWorkers = roundUSD(
    operatingIncomeEbitda - workerParticipation15
  );
  const incomeTax25 =
    taxableAfterWorkers > 0 ? roundUSD(taxableAfterWorkers * 0.25) : 0;
  const netIncome = roundUSD(
    operatingIncomeEbitda - workerParticipation15 - incomeTax25
  );
  const netMarginPct =
    totalNetRevenue > 0 ? roundUSD((netIncome / totalNetRevenue) * 100) : 0;

  // Balance Sheet Calculation (Equation: Assets = Liabilities + Equity)
  const cashSales = activeInvoices
    .filter((i) => i.paymentMethod === 'efectivo')
    .reduce((s, i) => s + i.totals.grandTotal, 0);
  const cashPurchasesPaid = params.purchases
    .filter((p) => p.status === 'pagada' && p.paymentMethod === 'efectivo')
    .reduce((s, p) => s + p.netPayable, 0);

  const cashAndDrawer = roundUSD(
    params.openingCash + cashSales - expensePettyCash - cashPurchasesPaid
  );

  const electronicSales = activeInvoices
    .filter((i) => i.paymentMethod !== 'efectivo')
    .reduce((s, i) => s + i.totals.grandTotal, 0);
  const bankPurchasesPaid = params.purchases
    .filter((p) => p.status === 'pagada' && p.paymentMethod === 'transferencia')
    .reduce((s, p) => s + p.netPayable, 0);

  const bankAndElectronic = roundUSD(2850 + electronicSales - bankPurchasesPaid);
  const inventoryValuation = roundUSD(1420 - totalCostOfSales);
  const sriSummary = calculateSriTaxSummary(params.invoices, params.purchases);
  const taxCreditAsset = sriSummary.remainingTaxCredit;
  const fixedAssetsEquipment = 8500.0; // Hornos de leña, campanas inox, refrigeración

  const totalAssets = roundUSD(
    cashAndDrawer +
      bankAndElectronic +
      inventoryValuation +
      taxCreditAsset +
      fixedAssetsEquipment
  );

  const accountsPayableSuppliers = roundUSD(
    params.purchases
      .filter((p) => p.status === 'por_pagar')
      .reduce((s, p) => s + p.netPayable, 0)
  );
  const taxesPayableSri = roundUSD(
    sriSummary.totalSriPayable + workerParticipation15 + incomeTax25
  );
  const payrollAndIessPayable = roundUSD(
    params.payroll
      .filter((e) => e.paidStatus === 'pendiente')
      .reduce((s, e) => s + e.netTakeHome, 0) +
      params.payroll.reduce((s, e) => s + e.iessPersonal + e.iessEmployer, 0) *
        0.25
  );

  const totalLiabilities = roundUSD(
    accountsPayableSuppliers + taxesPayableSri + payrollAndIessPayable
  );

  const paidInCapital = 10000.0;
  const currentPeriodNetIncome = netIncome;
  const retainedEarningsAndReserves = roundUSD(
    totalAssets - totalLiabilities - paidInCapital - currentPeriodNetIncome
  );
  const totalEquity = roundUSD(
    paidInCapital + retainedEarningsAndReserves + currentPeriodNetIncome
  );

  return {
    revenueDineIn,
    revenueDelivery,
    revenueTakeout,
    totalNetRevenue,
    costAvicola,
    costCarbonLena,
    costAbarrotesBebidas,
    totalCostOfSales,
    grossProfit,
    grossMarginPct,
    expensePackaging,
    expenseUtilitiesAndRent,
    expensePettyCash,
    expensePayrollProrated,
    totalOperatingExpenses,
    operatingIncomeEbitda,
    workerParticipation15,
    incomeTax25,
    netIncome,
    netMarginPct,
    cashAndDrawer,
    bankAndElectronic,
    inventoryValuation,
    taxCreditAsset,
    fixedAssetsEquipment,
    totalAssets,
    accountsPayableSuppliers,
    taxesPayableSri,
    payrollAndIessPayable,
    totalLiabilities,
    paidInCapital,
    retainedEarningsAndReserves,
    currentPeriodNetIncome,
    totalEquity,
  };
}

export interface LedgerMovement {
  entryNumber: string;
  date: string;
  referenceDoc: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  group: AccountGroup;
  debitSum: number;
  creditSum: number;
  debitBalance: number;
  creditBalance: number;
  movements: LedgerMovement[];
}

export interface TrialBalanceSummary {
  rows: TrialBalanceRow[];
  totalDebitSum: number;
  totalCreditSum: number;
  totalDebitBalance: number;
  totalCreditBalance: number;
}

/**
 * Computes the General Ledger (Libro Mayor) and Trial Balance (Balance de Comprobación de Sumas y Saldos)
 * from the active journal entries.
 */
export function calculateTrialBalance(
  journalEntries: JournalEntry[]
): TrialBalanceSummary {
  const rowMap = new Map<string, TrialBalanceRow>();

  for (const acc of CHART_OF_ACCOUNTS) {
    rowMap.set(acc.code, {
      accountCode: acc.code,
      accountName: acc.name,
      group: acc.group,
      debitSum: 0,
      creditSum: 0,
      debitBalance: 0,
      creditBalance: 0,
      movements: [],
    });
  }

  // Process chronologically (oldest to newest)
  const chronological = [...journalEntries].reverse();
  for (const entry of chronological) {
    for (const line of entry.lines) {
      const existing = rowMap.get(line.accountCode) ?? {
        accountCode: line.accountCode,
        accountName: line.accountName,
        group: 'gasto' as AccountGroup,
        debitSum: 0,
        creditSum: 0,
        debitBalance: 0,
        creditBalance: 0,
        movements: [],
      };

      existing.debitSum = roundUSD(existing.debitSum + line.debit);
      existing.creditSum = roundUSD(existing.creditSum + line.credit);
      const net = roundUSD(existing.debitSum - existing.creditSum);
      existing.debitBalance = net > 0 ? net : 0;
      existing.creditBalance = net < 0 ? Math.abs(net) : 0;

      existing.movements.push({
        entryNumber: entry.entryNumber,
        date: entry.date,
        referenceDoc: entry.referenceDoc,
        description: entry.description,
        debit: line.debit,
        credit: line.credit,
        runningBalance: net,
      });

      rowMap.set(line.accountCode, existing);
    }
  }

  const activeRows = Array.from(rowMap.values()).filter(
    (r) => r.debitSum > 0 || r.creditSum > 0
  );

  const totalDebitSum = roundUSD(
    activeRows.reduce((s, r) => s + r.debitSum, 0)
  );
  const totalCreditSum = roundUSD(
    activeRows.reduce((s, r) => s + r.creditSum, 0)
  );
  const totalDebitBalance = roundUSD(
    activeRows.reduce((s, r) => s + r.debitBalance, 0)
  );
  const totalCreditBalance = roundUSD(
    activeRows.reduce((s, r) => s + r.creditBalance, 0)
  );

  return {
    rows: activeRows,
    totalDebitSum,
    totalCreditSum,
    totalDebitBalance,
    totalCreditBalance,
  };
}


