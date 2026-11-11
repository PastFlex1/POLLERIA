export type PosModule =
  | 'facturacion'
  | 'facturas'
  | 'inventario'
  | 'arqueo'
  | 'contabilidad';

export type ProductCategory =
  | 'todos'
  | 'pollos'
  | 'combos'
  | 'porciones'
  | 'guarniciones'
  | 'bebidas';

export type ServiceChannel = 'domicilio' | 'mesa' | 'mostrador';

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

/** Ecuador: every factura is electronic; it is issued either to Consumidor Final or with buyer data */
export type InvoiceDocType = 'consumidor_final' | 'con_datos';

export type InvoiceStatus = 'emitida' | 'anulada';

export type EcuadorIdType = 'cedula' | 'ruc' | 'consumidor_final';

export interface PosProduct {
  id: string;
  plu: string;
  name: string;
  shortName: string;
  subtitle: string;
  category: Exclude<ProductCategory, 'todos'>;
  categoryLabel: string;
  /** Price in USD, IVA included */
  price: number;
  /** Number of chicken quarters (1 entero = 4, 1/2 = 2, 1/4 = 1, others = 0) deducted on sale */
  chickenQuartersEquivalent: number;
  stockUnits: number;
  requiresCut?: boolean;
  imageUrl: string;
  rating: number;
  totalSalesCount: number;
}

export interface InvoiceLineItem {
  lineId: string;
  product: PosProduct;
  quantity: number;
  unitPrice: number;
  cutNote: string;
  subtotal: number;
}

export interface InvoiceTotals {
  grossSubtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  /** Subtotal 15% (base imponible, sin IVA) */
  netBase: number;
  /** IVA 15% */
  ivaTax: number;
  grandTotal: number;
  totalItems: number;
  totalChickenQuarters: number;
}

export interface InvoiceRecord {
  id: string;
  /** SRI number: establecimiento-punto de emisión-secuencial (001-001-000001041) */
  folio: string;
  docType: InvoiceDocType;
  /** dd/mm/aaaa */
  issuedDate: string;
  /** HH:mm */
  createdAt: string;
  customerName: string;
  /** Cédula (10), RUC (13) or 9999999999999 for Consumidor Final */
  customerTaxId: string;
  customerPhone: string;
  customerEmail: string;
  channel: ServiceChannel;
  tableOrAddress: string;
  cashierName: string;
  paymentMethod: PaymentMethod;
  lines: InvoiceLineItem[];
  totals: InvoiceTotals;
  cashReceived: number;
  changeDue: number;
  /** 49-digit SRI clave de acceso (also the authorization number) */
  accessKey: string;
  status: InvoiceStatus;
  cancellationReason?: string;
}

export interface CashExpense {
  id: string;
  time: string;
  concept: string;
  supplierOrAuth: string;
  amount: number;
}

export interface CashReconciliationSummary {
  openingCash: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalActiveSales: number;
  cancelledSalesTotal: number;
  totalCashExpenses: number;
  expectedCashInDrawer: number;
  countedCash: number;
  discrepancy: number;
  activeInvoicesCount: number;
  cancelledInvoicesCount: number;
}

/** IVA Ecuador (vigente desde abril 2024) */
export const IVA_RATE = 0.15;

/** SRI: facturas a Consumidor Final no pueden superar este valor */
export const CONSUMIDOR_FINAL_MAX_TOTAL = 50;

export const CONSUMIDOR_FINAL_NAME = 'CONSUMIDOR FINAL';
export const CONSUMIDOR_FINAL_ID = '9999999999999';

/** Recargo por domicilio en USD (IVA incluido) */
export const DELIVERY_FEE_USD = 1.5;

/**
 * Fictitious issuer data. Environment '1' = PRUEBAS, so the generated documents have no tax validity.
 */
export const BUSINESS_INFO = {
  legalName: 'BRASA & ROBLE CÍA. LTDA.',
  tradeName: 'Brasa & Roble — Asadero Artesanal',
  ruc: '1793212345001',
  headOfficeAddress: 'Av. Amazonas N24-03 y Wilson, Quito',
  branchAddress: 'Av. Amazonas N24-03 y Wilson, Quito',
  phone: '(02) 254 8910',
  establishment: '001',
  emissionPoint: '001',
  environment: '1' as '1' | '2',
  keepsAccounting: true,
};

export const SRI_PAYMENT_METHODS: Record<
  PaymentMethod,
  { code: string; label: string }
> = {
  efectivo: { code: '01', label: 'SIN UTILIZACIÓN DEL SISTEMA FINANCIERO' },
  tarjeta: { code: '19', label: 'TARJETA DE CRÉDITO' },
  transferencia: {
    code: '20',
    label: 'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO',
  },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

export const CUT_PRESETS = [
  '8 Presas (Tradicional)',
  '4 Cuartos',
  'Entero sin cortar',
  'Deshuesado',
];

const IMG_HERO_POLLO = '/assets/images/hero_pollo_brasa_1794335771940.jpg';
const IMG_COMBO = '/assets/images/combo_familiar_brasa_1794335773635.jpg';
const IMG_MEDIO = '/assets/images/medio_pollo_artesanal_1794335775071.jpg';
const IMG_COSTILLAS = '/assets/images/costillas_y_alitas_lena_1794335776193.jpg';
const IMG_GUARNICIONES = '/assets/images/acompanamientos_criollos_1794335777748.jpg';

export const CATEGORY_CIRCLES: {
  id: ProductCategory;
  label: string;
  countLabel: string;
  imageUrl: string;
}[] = [
  {
    id: 'todos',
    label: 'Todos',
    countLabel: '14 ítems',
    imageUrl: IMG_HERO_POLLO,
  },
  {
    id: 'pollos',
    label: 'Pollos Brasa',
    countLabel: 'Entero y Medio',
    imageUrl: IMG_HERO_POLLO,
  },
  {
    id: 'combos',
    label: 'Combos',
    countLabel: 'Familiares',
    imageUrl: IMG_COMBO,
  },
  {
    id: 'porciones',
    label: 'Costillas y 1/4',
    countLabel: 'Parrilla Leña',
    imageUrl: IMG_COSTILLAS,
  },
  {
    id: 'guarniciones',
    label: 'Acompañados',
    countLabel: 'Papas y Menestra',
    imageUrl: IMG_GUARNICIONES,
  },
  {
    id: 'bebidas',
    label: 'Bebidas y Ají',
    countLabel: 'Jugos y Colas',
    imageUrl: IMG_MEDIO,
  },
];

export const INITIAL_POS_PRODUCTS: PosProduct[] = [
  {
    id: 'prod-entero',
    plu: 'PLU-101',
    name: '1 Pollo Entero Asado al Carbón',
    shortName: 'Pollo Entero Brasa',
    subtitle: '8 presas · Papas fritas y arroz',
    category: 'pollos',
    categoryLabel: 'Pollos al Carbón',
    price: 14.0,
    chickenQuartersEquivalent: 4,
    stockUnits: 28,
    requiresCut: true,
    imageUrl: IMG_HERO_POLLO,
    rating: 4.9,
    totalSalesCount: 1420,
  },
  {
    id: 'prod-combo-familiar',
    plu: 'PLU-201',
    name: 'Combo Familiar (1 Pollo + Papas + Arroz + Menestra + Cola 1.5L)',
    shortName: 'Combo Familiar',
    subtitle: '1 Pollo + Menestra + Cola 1.5L',
    category: 'combos',
    categoryLabel: 'Combos Familiares',
    price: 18.5,
    chickenQuartersEquivalent: 4,
    stockUnits: 18,
    requiresCut: true,
    imageUrl: IMG_COMBO,
    rating: 4.8,
    totalSalesCount: 1180,
  },
  {
    id: 'prod-medio',
    plu: 'PLU-102',
    name: '1/2 Pollo Asado con Papas y Arroz',
    shortName: 'Medio Pollo Brasa',
    subtitle: '4 presas + papas fritas',
    category: 'pollos',
    categoryLabel: 'Pollos al Carbón',
    price: 7.75,
    chickenQuartersEquivalent: 2,
    stockUnits: 34,
    requiresCut: true,
    imageUrl: IMG_MEDIO,
    rating: 4.7,
    totalSalesCount: 990,
  },
  {
    id: 'prod-costillas-lena',
    plu: 'PLU-203',
    name: 'Costillas BBQ Ahumadas a la Leña (450 g)',
    shortName: 'Costillas a la Leña',
    subtitle: 'Ahumadas 4 h + maduro con queso',
    category: 'porciones',
    categoryLabel: 'Porciones y Presas',
    price: 9.5,
    chickenQuartersEquivalent: 0,
    stockUnits: 15,
    imageUrl: IMG_COSTILLAS,
    rating: 4.8,
    totalSalesCount: 840,
  },
  {
    id: 'prod-combo-pollo-medio',
    plu: 'PLU-202',
    name: 'Combo 1 Pollo y Medio + Acompañado Doble',
    shortName: 'Super Combo 1.5',
    subtitle: '12 presas + patacones + ensalada',
    category: 'combos',
    categoryLabel: 'Combos Familiares',
    price: 24.0,
    chickenQuartersEquivalent: 6,
    stockUnits: 12,
    requiresCut: true,
    imageUrl: IMG_COMBO,
    rating: 4.9,
    totalSalesCount: 620,
  },
  {
    id: 'prod-cuarto-pechuga',
    plu: 'PLU-103',
    name: '1/4 Pollo (Pechuga y Ala)',
    shortName: '1/4 Pechuga Brasa',
    subtitle: 'Pechuga dorada + papas y ají',
    category: 'porciones',
    categoryLabel: 'Porciones y Presas',
    price: 4.25,
    chickenQuartersEquivalent: 1,
    stockUnits: 22,
    imageUrl: IMG_MEDIO,
    rating: 4.6,
    totalSalesCount: 730,
  },
  {
    id: 'prod-cuarto-pierna',
    plu: 'PLU-104',
    name: '1/4 Pollo (Pierna y Muslo)',
    shortName: '1/4 Pierna y Muslo',
    subtitle: 'Pierna y muslo al carbón',
    category: 'porciones',
    categoryLabel: 'Porciones y Presas',
    price: 3.75,
    chickenQuartersEquivalent: 1,
    stockUnits: 26,
    imageUrl: IMG_MEDIO,
    rating: 4.7,
    totalSalesCount: 810,
  },
  {
    id: 'prod-papas-fritas',
    plu: 'PLU-301',
    name: 'Porción de Papas Fritas',
    shortName: 'Papas Fritas',
    subtitle: 'Crocantes, con sal y ají',
    category: 'guarniciones',
    categoryLabel: 'Acompañados',
    price: 2.0,
    chickenQuartersEquivalent: 0,
    stockUnits: 45,
    imageUrl: IMG_GUARNICIONES,
    rating: 4.8,
    totalSalesCount: 1540,
  },
  {
    id: 'prod-menestra',
    plu: 'PLU-302',
    name: 'Porción de Menestra de Lenteja con Arroz',
    shortName: 'Menestra con Arroz',
    subtitle: 'Menestra casera y arroz blanco',
    category: 'guarniciones',
    categoryLabel: 'Acompañados',
    price: 2.5,
    chickenQuartersEquivalent: 0,
    stockUnits: 40,
    imageUrl: IMG_GUARNICIONES,
    rating: 4.7,
    totalSalesCount: 1120,
  },
  {
    id: 'prod-patacones',
    plu: 'PLU-303',
    name: 'Orden de Patacones (4 uds)',
    shortName: 'Patacones',
    subtitle: 'Verde frito con queso',
    category: 'guarniciones',
    categoryLabel: 'Acompañados',
    price: 2.0,
    chickenQuartersEquivalent: 0,
    stockUnits: 38,
    imageUrl: IMG_GUARNICIONES,
    rating: 4.9,
    totalSalesCount: 1290,
  },
  {
    id: 'prod-ensalada-casa',
    plu: 'PLU-304',
    name: 'Ensalada Fresca de Aguacate y Tomate',
    shortName: 'Ensalada Aguacate',
    subtitle: 'Aguacate, cebolla paiteña y cilantro',
    category: 'guarniciones',
    categoryLabel: 'Acompañados',
    price: 2.25,
    chickenQuartersEquivalent: 0,
    stockUnits: 25,
    imageUrl: IMG_COMBO,
    rating: 4.6,
    totalSalesCount: 540,
  },
  {
    id: 'prod-cola-familiar',
    plu: 'PLU-401',
    name: 'Cola Familiar 1.5 Litros',
    shortName: 'Cola 1.5L',
    subtitle: 'Fría para compartir en mesa',
    category: 'bebidas',
    categoryLabel: 'Bebidas y Salsas',
    price: 2.25,
    chickenQuartersEquivalent: 0,
    stockUnits: 60,
    imageUrl: IMG_COMBO,
    rating: 4.8,
    totalSalesCount: 1680,
  },
  {
    id: 'prod-jugo-naranjilla',
    plu: 'PLU-402',
    name: 'Jarra de Jugo de Naranjilla (1L)',
    shortName: 'Jarra Naranjilla 1L',
    subtitle: 'Fruta natural, recién licuada',
    category: 'bebidas',
    categoryLabel: 'Bebidas y Salsas',
    price: 3.5,
    chickenQuartersEquivalent: 0,
    stockUnits: 30,
    imageUrl: IMG_GUARNICIONES,
    rating: 4.9,
    totalSalesCount: 890,
  },
  {
    id: 'prod-tarro-aji',
    plu: 'PLU-403',
    name: 'Tarrina Adicional de Ají de la Casa (8 oz)',
    shortName: 'Ají de la Casa 8oz',
    subtitle: 'Ají de tomate de árbol',
    category: 'bebidas',
    categoryLabel: 'Bebidas y Salsas',
    price: 1.0,
    chickenQuartersEquivalent: 0,
    stockUnits: 50,
    imageUrl: IMG_HERO_POLLO,
    rating: 4.9,
    totalSalesCount: 1100,
  },
];

/** Rounds to cents (USD). */
export function roundUSD(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Formats US dollars (Ecuador's currency) with cents, e.g. $1,250.00
 */
export function formatUSD(value: number): string {
  const cents = Math.round(value * 100);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const integerPart = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimals = String(abs % 100).padStart(2, '0');
  return `${sign}$${integerPart}.${decimals}`;
}

/** Formats a date as dd/mm/aaaa. */
export function formatDateEC(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(
    date.getMonth() + 1
  ).padStart(2, '0')}/${date.getFullYear()}`;
}

/** Builds the SRI invoice number 001-001-000000123. */
export function formatInvoiceNumber(
  sequential: number,
  establishment: string = BUSINESS_INFO.establishment,
  emissionPoint: string = BUSINESS_INFO.emissionPoint
): string {
  return `${establishment}-${emissionPoint}-${String(sequential).padStart(9, '0')}`;
}

/** Módulo 11 check digit used by the SRI clave de acceso. */
export function mod11CheckDigit(digits: string): number {
  let factor = 2;
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const result = 11 - (sum % 11);
  if (result === 11) return 0;
  if (result === 10) return 1;
  return result;
}

/**
 * Generates the 49-digit SRI clave de acceso:
 * fecha(8) + tipo comprobante(2) + RUC(13) + ambiente(1) + serie(6) +
 * secuencial(9) + código numérico(8) + tipo emisión(1) + dígito verificador(1)
 */
export function generateAccessKey(params: {
  date: Date;
  sequential: number;
  numericCode: string;
  docTypeCode?: string;
  ruc?: string;
  environment?: '1' | '2';
  establishment?: string;
  emissionPoint?: string;
}): string {
  const d = params.date;
  const datePart = `${String(d.getDate()).padStart(2, '0')}${String(
    d.getMonth() + 1
  ).padStart(2, '0')}${d.getFullYear()}`;
  const base =
    datePart +
    (params.docTypeCode ?? '01') +
    (params.ruc ?? BUSINESS_INFO.ruc) +
    (params.environment ?? BUSINESS_INFO.environment) +
    (params.establishment ?? BUSINESS_INFO.establishment) +
    (params.emissionPoint ?? BUSINESS_INFO.emissionPoint) +
    String(params.sequential).padStart(9, '0') +
    params.numericCode.padStart(8, '0').slice(-8) +
    '1';
  return base + mod11CheckDigit(base);
}

function isValidCedula(id: string): boolean {
  if (!/^\d{10}$/.test(id)) return false;
  const province = Number(id.slice(0, 2));
  if (!((province >= 1 && province <= 24) || province === 30)) return false;
  if (Number(id[2]) >= 6) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let value = Number(id[i]) * (i % 2 === 0 ? 2 : 1);
    if (value > 9) value -= 9;
    sum += value;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(id[9]);
}

/**
 * Validates an Ecuadorian identification: cédula (10 digits, módulo 10),
 * RUC (13 digits) or the Consumidor Final id 9999999999999.
 */
export function validateEcuadorianId(raw: string): {
  valid: boolean;
  type?: EcuadorIdType;
  error?: string;
} {
  const id = raw.trim();
  if (id === CONSUMIDOR_FINAL_ID) {
    return { valid: true, type: 'consumidor_final' };
  }
  if (/^\d{10}$/.test(id)) {
    return isValidCedula(id)
      ? { valid: true, type: 'cedula' }
      : { valid: false, error: 'La cédula ingresada no es válida.' };
  }
  if (/^\d{13}$/.test(id)) {
    const province = Number(id.slice(0, 2));
    const thirdDigit = Number(id[2]);
    const provinceOk =
      (province >= 1 && province <= 24) || province === 30;
    let ok = provinceOk;
    if (thirdDigit < 6) {
      ok = ok && isValidCedula(id.slice(0, 10)) && id.endsWith('001');
    } else if (thirdDigit === 6) {
      ok = ok && id.endsWith('0001');
    } else if (thirdDigit === 9) {
      ok = ok && id.endsWith('001');
    } else {
      ok = false;
    }
    return ok
      ? { valid: true, type: 'ruc' }
      : { valid: false, error: 'El RUC ingresado no es válido.' };
  }
  return {
    valid: false,
    error: 'Ingresa una cédula (10 dígitos) o un RUC (13 dígitos).',
  };
}

/**
 * Computes invoice totals. Menu prices include IVA 15% (precio final al consumidor),
 * so the taxable base is extracted: Base = Total / 1.15. Delivery is a taxed service.
 */
export function calculateInvoiceTotals(
  lines: InvoiceLineItem[],
  discountPercent: number = 0,
  channel: ServiceChannel = 'mostrador',
  deliveryFee: number = DELIVERY_FEE_USD
): InvoiceTotals {
  const safeDiscountPct = Math.max(0, Math.min(50, discountPercent));
  const grossSubtotal = roundUSD(lines.reduce((sum, l) => sum + l.subtotal, 0));
  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalChickenQuarters = lines.reduce(
    (sum, l) => sum + l.product.chickenQuartersEquivalent * l.quantity,
    0
  );

  const discountAmount = roundUSD(grossSubtotal * (safeDiscountPct / 100));
  const afterDiscount = Math.max(0, roundUSD(grossSubtotal - discountAmount));
  const effectiveDelivery =
    channel === 'domicilio' && totalItems > 0 ? Math.max(0, deliveryFee) : 0;

  const grandTotal = roundUSD(afterDiscount + effectiveDelivery);
  const netBase = roundUSD(grandTotal / (1 + IVA_RATE));
  const ivaTax = roundUSD(grandTotal - netBase);

  return {
    grossSubtotal,
    discountAmount,
    deliveryCharge: effectiveDelivery,
    netBase,
    ivaTax,
    grandTotal,
    totalItems,
    totalChickenQuarters,
  };
}

function seedLine(
  lineId: string,
  productIndex: number,
  quantity: number,
  cutNote: string
): InvoiceLineItem {
  const product = INITIAL_POS_PRODUCTS[productIndex];
  return {
    lineId,
    product,
    quantity,
    unitPrice: product.price,
    cutNote,
    subtotal: roundUSD(product.price * quantity),
  };
}

const SEED_DATE = new Date();

function seedInvoice(
  data: Omit<
    InvoiceRecord,
    'folio' | 'issuedDate' | 'totals' | 'accessKey' | 'changeDue'
  > & { sequential: number }
): InvoiceRecord {
  const { sequential, ...rest } = data;
  const totals = calculateInvoiceTotals(rest.lines, 0, rest.channel);
  return {
    ...rest,
    folio: formatInvoiceNumber(sequential),
    issuedDate: formatDateEC(SEED_DATE),
    totals,
    changeDue: roundUSD(Math.max(0, rest.cashReceived - totals.grandTotal)),
    accessKey: generateAccessKey({
      date: SEED_DATE,
      sequential,
      numericCode: String(sequential),
    }),
  };
}

export const INITIAL_INVOICES: InvoiceRecord[] = [
  seedInvoice({
    id: 'inv-1001',
    sequential: 1041,
    docType: 'consumidor_final',
    createdAt: '12:14',
    customerName: CONSUMIDOR_FINAL_NAME,
    customerTaxId: CONSUMIDOR_FINAL_ID,
    customerPhone: '',
    customerEmail: '',
    channel: 'mostrador',
    tableOrAddress: 'Mostrador · Para Llevar',
    cashierName: 'Cajero 01 · Andrés V.',
    paymentMethod: 'efectivo',
    lines: [
      seedLine('l-1', 0, 1, '8 Presas (Tradicional)'),
      seedLine('l-2', 11, 1, 'Estándar'),
    ],
    cashReceived: 20,
    status: 'emitida',
  }),
  seedInvoice({
    id: 'inv-1002',
    sequential: 1042,
    docType: 'con_datos',
    createdAt: '12:38',
    customerName: 'Distribuidora Andina S.A.',
    customerTaxId: '1792345678001',
    customerPhone: '099 482 9104',
    customerEmail: 'compras@distribuidora-andina.example',
    channel: 'domicilio',
    tableOrAddress: 'Av. República de El Salvador N35-40 y Portugal, Quito',
    cashierName: 'Cajero 01 · Andrés V.',
    paymentMethod: 'transferencia',
    lines: [
      seedLine('l-3', 1, 2, '8 Presas (Tradicional)'),
      seedLine('l-4', 9, 2, 'Estándar'),
    ],
    cashReceived: 42.5,
    status: 'emitida',
  }),
  seedInvoice({
    id: 'inv-1003',
    sequential: 1043,
    docType: 'con_datos',
    createdAt: '13:05',
    customerName: 'María Fernanda Andrade',
    customerTaxId: '1712345675',
    customerPhone: '098 739 2011',
    customerEmail: '',
    channel: 'mesa',
    tableOrAddress: 'Mesa 04 · Salón Principal',
    cashierName: 'Cajero 01 · Andrés V.',
    paymentMethod: 'tarjeta',
    lines: [
      seedLine('l-5', 2, 1, '4 Cuartos'),
      seedLine('l-6', 3, 1, 'Estándar'),
      seedLine('l-7', 12, 1, 'Estándar'),
    ],
    cashReceived: 20.75,
    status: 'emitida',
  }),
];

export const INITIAL_EXPENSES: CashExpense[] = [
  {
    id: 'exp-1',
    time: '10:45',
    concept: 'Compra de 4 paquetes de fundas térmicas y servilletas',
    supplierOrAuth: 'Papelería La Merced · Aut. Admin',
    amount: 8.5,
  },
  {
    id: 'exp-2',
    time: '11:20',
    concept: 'Pago descarga de 6 sacos de carbón vegetal',
    supplierOrAuth: 'Transportes El Roble',
    amount: 6,
  },
];

/**
 * Computes change due (vuelto) for cash transactions.
 */
export function calculateCashChange(
  grandTotal: number,
  cashReceived: number,
  paymentMethod: PaymentMethod
): { changeDue: number; isSufficient: boolean } {
  if (paymentMethod !== 'efectivo') {
    return { changeDue: 0, isSufficient: true };
  }
  if (Math.round(cashReceived * 100) < Math.round(grandTotal * 100)) {
    return { changeDue: 0, isSufficient: false };
  }
  return {
    changeDue: roundUSD(cashReceived - grandTotal),
    isSufficient: true,
  };
}

/**
 * Validates customer & payment inputs before issuing a factura (normativa SRI).
 */
export function validateInvoiceEmission(params: {
  lines: InvoiceLineItem[];
  docType: InvoiceDocType;
  customerName: string;
  customerTaxId: string;
  channel: ServiceChannel;
  tableOrAddress: string;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  grandTotal: number;
}): { valid: boolean; error?: string } {
  if (params.lines.length === 0) {
    return {
      valid: false,
      error: 'Agrega al menos un plato al pedido antes de confirmar.',
    };
  }

  if (params.docType === 'consumidor_final') {
    if (params.grandTotal > CONSUMIDOR_FINAL_MAX_TOTAL) {
      return {
        valid: false,
        error: `Las facturas a Consumidor Final no pueden superar ${formatUSD(
          CONSUMIDOR_FINAL_MAX_TOTAL
        )}. Ingresa la cédula o RUC del cliente.`,
      };
    }
  } else {
    if (params.customerName.trim().length < 3) {
      return {
        valid: false,
        error: 'Ingresa los nombres completos o la razón social del cliente.',
      };
    }
    const id = validateEcuadorianId(params.customerTaxId);
    if (!id.valid || id.type === 'consumidor_final') {
      return {
        valid: false,
        error:
          id.error ||
          'Para factura con datos ingresa una cédula o RUC distinto a Consumidor Final.',
      };
    }
  }

  if (params.channel === 'mesa' && !params.tableOrAddress.trim()) {
    return {
      valid: false,
      error: 'Indica el número de mesa para el servicio en salón.',
    };
  }

  if (params.channel === 'domicilio' && params.tableOrAddress.trim().length < 5) {
    return {
      valid: false,
      error: 'Ingresa la dirección de entrega para el domicilio.',
    };
  }

  if (
    params.paymentMethod === 'efectivo' &&
    Math.round(params.cashReceived * 100) < Math.round(params.grandTotal * 100)
  ) {
    return {
      valid: false,
      error: 'El efectivo recibido es menor al total a pagar.',
    };
  }

  return { valid: true };
}

/**
 * Computes the shift cash reconciliation (Arqueo / Cierre de Caja).
 */
export function calculateCashReconciliation(
  invoices: InvoiceRecord[],
  expenses: CashExpense[],
  openingCash: number,
  countedCash: number
): CashReconciliationSummary {
  const activeInvoices = invoices.filter((inv) => inv.status === 'emitida');
  const cancelledInvoices = invoices.filter((inv) => inv.status === 'anulada');

  const sumBy = (method: PaymentMethod) =>
    roundUSD(
      activeInvoices
        .filter((i) => i.paymentMethod === method)
        .reduce((sum, i) => sum + i.totals.grandTotal, 0)
    );

  const cashSales = sumBy('efectivo');
  const cardSales = sumBy('tarjeta');
  const transferSales = sumBy('transferencia');

  const totalActiveSales = roundUSD(cashSales + cardSales + transferSales);
  const cancelledSalesTotal = roundUSD(
    cancelledInvoices.reduce((sum, i) => sum + i.totals.grandTotal, 0)
  );

  const totalCashExpenses = roundUSD(
    expenses.reduce((sum, e) => sum + e.amount, 0)
  );
  const expectedCashInDrawer = roundUSD(
    openingCash + cashSales - totalCashExpenses
  );
  const discrepancy = roundUSD(countedCash - expectedCashInDrawer);

  return {
    openingCash,
    cashSales,
    cardSales,
    transferSales,
    totalActiveSales,
    cancelledSalesTotal,
    totalCashExpenses,
    expectedCashInDrawer,
    countedCash,
    discrepancy,
    activeInvoicesCount: activeInvoices.length,
    cancelledInvoicesCount: cancelledInvoices.length,
  };
}

/**
 * Computes chicken rotisserie inventory balance in whole chickens & quarters.
 */
export function calculateChickenKardex(
  initialWholeChickensLoaded: number,
  invoices: InvoiceRecord[],
  shrinkageQuarters: number = 0
) {
  const totalQuartersLoaded = initialWholeChickensLoaded * 4;
  const activeInvoices = invoices.filter((i) => i.status === 'emitida');

  const quartersSold = activeInvoices.reduce(
    (sum, inv) => sum + inv.totals.totalChickenQuarters,
    0
  );

  const remainingQuarters = Math.max(
    0,
    totalQuartersLoaded - quartersSold - shrinkageQuarters
  );

  const soldWholeEquivalent = Number((quartersSold / 4).toFixed(2));
  const remainingWholeChickens = Math.floor(remainingQuarters / 4);
  const remainingLooseQuarters = remainingQuarters % 4;

  return {
    totalQuartersLoaded,
    quartersSold,
    soldWholeEquivalent,
    remainingQuarters,
    remainingWholeChickens,
    remainingLooseQuarters,
  };
}

/**
 * Returns the next SRI invoice number. In Ecuador all facturas of one
 * establecimiento + punto de emisión share a single consecutive sequence.
 */
export function getNextInvoiceNumber(
  invoices: InvoiceRecord[],
  firstSequential: number = 1041
): { folio: string; sequential: number } {
  const maxUsed = invoices.reduce((max, inv) => {
    const n = Number(inv.folio.split('-')[2]);
    return Number.isFinite(n) && n > max ? n : max;
  }, firstSequential - 1);
  const sequential = maxUsed + 1;
  return { folio: formatInvoiceNumber(sequential), sequential };
}

/**
 * Checks that an order does not exceed product stock units nor the chicken
 * quarters still available on the rotisserie.
 */
export function checkStockAvailability(
  lines: InvoiceLineItem[],
  products: PosProduct[],
  remainingChickenQuarters: number
): { ok: boolean; error?: string } {
  const qtyByProduct = new Map<string, number>();
  for (const line of lines) {
    qtyByProduct.set(
      line.product.id,
      (qtyByProduct.get(line.product.id) ?? 0) + line.quantity
    );
  }

  for (const [productId, qty] of qtyByProduct) {
    const product = products.find((p) => p.id === productId);
    if (product && qty > product.stockUnits) {
      return {
        ok: false,
        error: `Stock insuficiente de ${product.shortName}: quedan ${product.stockUnits} uds.`,
      };
    }
  }

  const quartersNeeded = lines.reduce(
    (sum, l) => sum + l.product.chickenQuartersEquivalent * l.quantity,
    0
  );
  if (quartersNeeded > remainingChickenQuarters) {
    return {
      ok: false,
      error: `No hay pollo suficiente en el asador: el pedido requiere ${quartersNeeded} cuartos y quedan ${remainingChickenQuarters}.`,
    };
  }

  return { ok: true };
}

/**
 * Applies the quantities of invoice lines to product stock.
 * direction -1 = sale (deduct), +1 = cancellation (restore).
 */
export function applyLinesToStock(
  products: PosProduct[],
  lines: InvoiceLineItem[],
  direction: -1 | 1
): PosProduct[] {
  return products.map((prod) => {
    const qty = lines
      .filter((l) => l.product.id === prod.id)
      .reduce((sum, l) => sum + l.quantity, 0);
    if (qty === 0) return prod;
    return {
      ...prod,
      stockUnits: Math.max(0, prod.stockUnits + direction * qty),
      totalSalesCount: Math.max(0, prod.totalSalesCount - direction * qty),
    };
  });
}

/** Label for the buyer identification shown on documents. */
export function getIdLabel(id: string): string {
  if (id === CONSUMIDOR_FINAL_ID) return 'Identificación';
  return id.length === 13 ? 'RUC' : 'Cédula';
}
