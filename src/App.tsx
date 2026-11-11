/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid,
  ClipboardList,
  MapPin,
  Flame,
  Wallet,
  LogOut,
  Search,
  ChevronRight,
  ShoppingCart,
  Plus,
  Minus,
  Pencil,
  Settings,
  Bell,
  Star,
  Printer,
  AlertCircle,
  User,
  X,
  BookOpen,
} from 'lucide-react';
import {
  PosModule,
  ProductCategory,
  ServiceChannel,
  PaymentMethod,
  InvoiceDocType,
  PosProduct,
  InvoiceLineItem,
  InvoiceRecord,
  CashExpense,
  CATEGORY_CIRCLES,
  INITIAL_POS_PRODUCTS,
  INITIAL_INVOICES,
  INITIAL_EXPENSES,
  CUT_PRESETS,
  formatUSD,
  calculateInvoiceTotals,
  calculateCashChange,
  validateInvoiceEmission,
  calculateChickenKardex,
  getNextInvoiceNumber,
  checkStockAvailability,
  applyLinesToStock,
  generateAccessKey,
  formatDateEC,
  CONSUMIDOR_FINAL_NAME,
  CONSUMIDOR_FINAL_ID,
  CONSUMIDOR_FINAL_MAX_TOTAL,
  DELIVERY_FEE_USD,
  roundUSD,
  validateEcuadorianId,
} from './utils/asaderoLogic';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { InvoiceHistoryView } from './components/InvoiceHistoryView';
import { ChickenKardexView } from './components/ChickenKardexView';
import { CashRegisterCloseView } from './components/CashRegisterCloseView';
import { AccountingView } from './components/AccountingView';
import {
  PurchaseRecord,
  JournalEntry,
  EmployeePayrollItem,
  INITIAL_PURCHASES,
  INITIAL_PAYROLL,
  buildEmployeePayrollItem,
} from './utils/accountingLogic';

export default function App() {
  // Active workspace module
  const [activeModule, setActiveModule] = useState<PosModule>('facturacion');

  // Master store state
  const [products, setProducts] = useState<PosProduct[]>(INITIAL_POS_PRODUCTS);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES);
  const [expenses, setExpenses] = useState<CashExpense[]>(INITIAL_EXPENSES);
  const [purchases, setPurchases] =
    useState<PurchaseRecord[]>(INITIAL_PURCHASES);
  const [manualEntries, setManualEntries] = useState<JournalEntry[]>([]);
  const [payroll, setPayroll] =
    useState<EmployeePayrollItem[]>(INITIAL_PAYROLL);
  const [wholeChickensLoaded, setWholeChickensLoaded] = useState<number>(40);
  const [shrinkageQuarters, setShrinkageQuarters] = useState<number>(2);
  const [openingCash] = useState<number>(100);

  // Dashboard UI controls
  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategory>('todos');
  const [searchPlu, setSearchPlu] = useState<string>('');
  const [showAllDishes, setShowAllDishes] = useState<boolean>(false);
  const [editingHeaderDetails, setEditingHeaderDetails] =
    useState<boolean>(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Active Invoice / Ticket State in POS (Right Column)
  const [docType, setDocType] = useState<InvoiceDocType>('consumidor_final');
  const [channel, setChannel] = useState<ServiceChannel>('domicilio');
  const [customerName, setCustomerName] = useState<string>(
    CONSUMIDOR_FINAL_NAME
  );
  const [customerTaxId, setCustomerTaxId] =
    useState<string>(CONSUMIDOR_FINAL_ID);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [tableOrAddress, setTableOrAddress] = useState<string>(
    'Av. 6 de Diciembre N34-120 y Portugal, Quito'
  );
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [promoCodeLabel, setPromoCodeLabel] = useState<string>('BRASA10');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  // null = the cashier has not typed an amount; we suggest one rounded up from the total
  const [cashReceivedInput, setCashReceivedInput] = useState<number | null>(
    null
  );
  const [billingError, setBillingError] = useState<string>('');

  // Seed 2 items in the active Cart/Ticket matching the reference layout
  const [activeLines, setActiveLines] = useState<InvoiceLineItem[]>([
    {
      lineId: 'seed-line-1',
      product: INITIAL_POS_PRODUCTS[0], // Pollo Entero Brasa ($14.00)
      quantity: 2,
      unitPrice: INITIAL_POS_PRODUCTS[0].price,
      cutNote: CUT_PRESETS[0],
      subtotal: roundUSD(INITIAL_POS_PRODUCTS[0].price * 2),
    },
    {
      lineId: 'seed-line-2',
      product: INITIAL_POS_PRODUCTS[1], // Combo Familiar ($18.50)
      quantity: 1,
      unitPrice: INITIAL_POS_PRODUCTS[1].price,
      cutNote: CUT_PRESETS[1],
      subtotal: INITIAL_POS_PRODUCTS[1].price,
    },
  ]);

  // 80mm Thermal Receipt Modal Preview State
  const [inspectingInvoice, setInspectingInvoice] =
    useState<InvoiceRecord | null>(null);

  // Hides the floating "Ver pedido" button (phones/tablets) while the order card is on screen
  const [ticketInView, setTicketInView] = useState<boolean>(false);
  useEffect(() => {
    if (activeModule !== 'facturacion') return;
    const el = document.getElementById('pos-ticket');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setTicketInView(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      setTicketInView(false);
    };
  }, [activeModule]);

  // Filtered POS products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'todos' || p.category === selectedCategory;
      const q = searchPlu.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.plu.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategory, searchPlu]);

  const displayedDishes = showAllDishes
    ? filteredProducts
    : filteredProducts.slice(0, 6); // 6 fills 2 or 3 columns; the 4-column grid hides the last two

  // Live Invoice Calculations
  const currentTotals = useMemo(
    () =>
      calculateInvoiceTotals(
        activeLines,
        discountPercent,
        channel,
        DELIVERY_FEE_USD
      ),
    [activeLines, discountPercent, channel]
  );

  // Suggest the next $5 bill amount
  const suggestedCash = Math.ceil(currentTotals.grandTotal / 5) * 5;
  const cashReceivedValue = cashReceivedInput ?? suggestedCash;
  const effectiveCashReceived =
    paymentMethod === 'efectivo' ? cashReceivedValue : currentTotals.grandTotal;

  const cashChange = useMemo(
    () =>
      calculateCashChange(
        currentTotals.grandTotal,
        effectiveCashReceived,
        paymentMethod
      ),
    [currentTotals.grandTotal, effectiveCashReceived, paymentMethod]
  );

  const kardex = useMemo(
    () =>
      calculateChickenKardex(wholeChickensLoaded, invoices, shrinkageQuarters),
    [wholeChickensLoaded, invoices, shrinkageQuarters]
  );

  const taxIdCheck = validateEcuadorianId(customerTaxId);
  const nextInvoice = getNextInvoiceNumber(invoices);
  const nextFolioCode = nextInvoice.folio;

  const markImgBroken = (id: string) => {
    setBrokenImages((prev) => ({ ...prev, [id]: true }));
  };

  // Applies a new set of ticket lines only if stock and rotisserie quarters allow it
  const tryUpdateLines = (nextLines: InvoiceLineItem[]): boolean => {
    const stock = checkStockAvailability(
      nextLines,
      products,
      kardex.remainingQuarters
    );
    if (!stock.ok) {
      setBillingError(stock.error || 'Stock insuficiente.');
      return false;
    }
    setBillingError('');
    setActiveLines(nextLines);
    return true;
  };

  // Add product to right-hand ticket (places the updated/new item at the top of the cart so it's immediately visible)
  const handleAddProductToTicket = (product: PosProduct) => {
    const cutToUse = product.requiresCut ? CUT_PRESETS[0] : 'Estándar';
    const existingIndex = activeLines.findIndex(
      (l) => l.product.id === product.id && l.cutNote === cutToUse
    );

    let updatedLines: InvoiceLineItem[];
    if (existingIndex > -1) {
      const target = activeLines[existingIndex];
      const incremented: InvoiceLineItem = {
        ...target,
        quantity: target.quantity + 1,
        subtotal: roundUSD((target.quantity + 1) * target.unitPrice),
      };
      updatedLines = [
        incremented,
        ...activeLines.filter((_, idx) => idx !== existingIndex),
      ];
    } else {
      updatedLines = [
        {
          lineId: `line-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          product,
          quantity: 1,
          unitPrice: product.price,
          cutNote: cutToUse,
          subtotal: product.price,
        },
        ...activeLines,
      ];
    }

    tryUpdateLines(updatedLines);
  };

  const handleUpdateLineQuantity = (lineId: string, delta: number) => {
    const updatedLines = activeLines
      .map((line) => {
        if (line.lineId !== lineId) return line;
        const nextQty = line.quantity + delta;
        return {
          ...line,
          quantity: nextQty,
          subtotal: roundUSD(nextQty * line.unitPrice),
        };
      })
      .filter((line) => line.quantity > 0);

    if (delta > 0) {
      tryUpdateLines(updatedLines);
    } else {
      setBillingError('');
      setActiveLines(updatedLines);
    }
  };

  // Switching channel clears the destination so an address is never reused as a table number
  const handleChangeChannel = (next: ServiceChannel) => {
    if (next === channel) return;
    setChannel(next);
    setTableOrAddress('');
    setBillingError('');
    if (next !== 'mostrador') setEditingHeaderDetails(true);
  };

  // Cycle cut preset when clicking the white edit pill on a cart line
  const handleCycleLineCut = (lineId: string) => {
    setActiveLines((prev) =>
      prev.map((line) => {
        if (line.lineId !== lineId) return line;
        const currentIdx = CUT_PRESETS.indexOf(line.cutNote);
        const nextCut =
          CUT_PRESETS[(currentIdx + 1) % CUT_PRESETS.length] || CUT_PRESETS[0];
        return { ...line, cutNote: nextCut };
      })
    );
  };

  // Cycle promo discount when clicking the dark promotion code pill
  const handleCyclePromoDiscount = () => {
    if (discountPercent === 0) {
      setDiscountPercent(10);
      setPromoCodeLabel('BRASA10 (-10%)');
    } else if (discountPercent === 10) {
      setDiscountPercent(5);
      setPromoCodeLabel('ROBLE5 (-5%)');
    } else {
      setDiscountPercent(0);
      setPromoCodeLabel('BRASA10');
    }
  };

  const handleEmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const destinationText =
      channel === 'mostrador'
        ? 'Mostrador · Para Llevar'
        : tableOrAddress.trim();

    const stock = checkStockAvailability(
      activeLines,
      products,
      kardex.remainingQuarters
    );
    if (!stock.ok) {
      setBillingError(stock.error || 'Stock insuficiente.');
      return;
    }

    const validation = validateInvoiceEmission({
      lines: activeLines,
      docType,
      customerName,
      customerTaxId,
      channel,
      tableOrAddress: destinationText,
      paymentMethod,
      cashReceived: effectiveCashReceived,
      grandTotal: currentTotals.grandTotal,
    });

    if (!validation.valid) {
      setBillingError(validation.error || 'Verifica los datos de facturación.');
      setEditingHeaderDetails(true);
      return;
    }

    setBillingError('');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newInvoice: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      folio: nextFolioCode,
      docType,
      issuedDate: formatDateEC(now),
      createdAt: timeStr,
      customerName: customerName.trim().toUpperCase(),
      customerTaxId: customerTaxId.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      accessKey: generateAccessKey({
        date: now,
        sequential: nextInvoice.sequential,
        numericCode: String(Math.floor(Math.random() * 1e8)),
      }),
      channel,
      tableOrAddress: destinationText,
      cashierName: 'Cajero 01 · Andrés V.',
      paymentMethod,
      lines: [...activeLines],
      totals: currentTotals,
      cashReceived: effectiveCashReceived,
      changeDue: cashChange.changeDue,
      status: 'emitida',
    };

    // Deduct stock units per product
    setProducts((prev) => applyLinesToStock(prev, activeLines, -1));

    setInvoices((prev) => [newInvoice, ...prev]);
    setInspectingInvoice(newInvoice);

    // Reset the ticket so the next customer starts clean
    setActiveLines([]);
    setDiscountPercent(0);
    setPromoCodeLabel('BRASA10');
    setDocType('consumidor_final');
    setCustomerName(CONSUMIDOR_FINAL_NAME);
    setCustomerTaxId(CONSUMIDOR_FINAL_ID);
    setCustomerPhone('');
    setCustomerEmail('');
    setTableOrAddress('');
    setCashReceivedInput(null);
    setEditingHeaderDetails(false);
  };

  const handleCancelInvoice = (invoiceId: string, reason: string) => {
    const target = invoices.find((inv) => inv.id === invoiceId);
    if (!target || target.status !== 'emitida') return;

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: 'anulada', cancellationReason: reason }
          : inv
      )
    );
    // Return the cancelled units to stock
    setProducts((prev) => applyLinesToStock(prev, target.lines, 1));
  };

  const handleAddWholeChickensBatch = (count: number) => {
    setWholeChickensLoaded((prev) => prev + count);
  };

  const handleRegisterShrinkageQuarter = (quarters: number) => {
    setShrinkageQuarters((prev) => prev + quarters);
  };

  const handleRestockProduct = (productId: string, units: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, stockUnits: p.stockUnits + units } : p
      )
    );
  };

  const handleAddExpense = (
    concept: string,
    supplierOrAuth: string,
    amount: number
  ) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const newExp: CashExpense = {
      id: `exp-${Date.now()}`,
      time: timeStr,
      concept,
      supplierOrAuth,
      amount,
    };
    setExpenses((prev) => [newExp, ...prev]);
  };

  const handleAddPurchase = (purchase: PurchaseRecord) => {
    setPurchases((prev) => [purchase, ...prev]);
  };

  const handleMarkPurchasePaid = (
    purchaseId: string,
    method: 'efectivo' | 'transferencia'
  ) => {
    setPurchases((prev) =>
      prev.map((p) =>
        p.id === purchaseId
          ? { ...p, status: 'pagada', paymentMethod: method }
          : p
      )
    );
  };

  const handleAddManualEntry = (entry: JournalEntry) => {
    setManualEntries((prev) => [...prev, entry]);
  };

  const handleTogglePayrollPaid = (empId: string) => {
    setPayroll((prev) =>
      prev.map((emp) =>
        emp.id === empId
          ? {
              ...emp,
              paidStatus: emp.paidStatus === 'pagado' ? 'pendiente' : 'pagado',
            }
          : emp
      )
    );
  };

  const handleAddOvertimeHour = (empId: string, deltaHours: number) => {
    setPayroll((prev) =>
      prev.map((emp) =>
        emp.id === empId
          ? buildEmployeePayrollItem({
              id: emp.id,
              name: emp.name,
              cedula: emp.cedula,
              role: emp.role,
              baseSalary: emp.baseSalary,
              overtimeHours: Math.max(0, emp.overtimeHours + deltaHours),
              paidStatus: emp.paidStatus,
            })
          : emp
      )
    );
  };

  const handleAddEmployee = (emp: EmployeePayrollItem) => {
    setPayroll((prev) => [...prev, emp]);
  };

  const navItems: {
    id: PosModule;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'facturacion', label: 'Facturar', icon: LayoutGrid },
    { id: 'facturas', label: 'Facturas', icon: ClipboardList },
    { id: 'inventario', label: 'Asadores', icon: Flame },
    { id: 'arqueo', label: 'Finanzas', icon: Wallet },
    { id: 'contabilidad', label: 'Contabilidad', icon: BookOpen },
  ];

  const ticketItemsCount = activeLines.reduce((sum, l) => sum + l.quantity, 0);

  const scrollToTicket = () => {
    document
      .getElementById('pos-ticket')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const flameLogo = (sizeClass: string, gradientId: string) => (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`${sizeClass} drop-shadow-[0_4px_12px_rgba(240,78,62,0.45)] transition-transform group-hover:scale-105`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D32F2F" />
          <stop offset="55%" stopColor="#F04E3E" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      <path
        d="M35 6C24 12 18 22 24 31C28 36 39 37 38 45C37 51 28 53 21 48C17 53 23 60 34 59C46 58 53 48 49 38C45 29 33 28 33 20C33 15 39 12 44 14C44 9 40 6 35 6Z"
        fill={`url(#${gradientId})`}
      />
      <circle cx="24" cy="14" r="3" fill="#FFA000" />
      <circle cx="44" cy="22" r="2.5" fill="#FFCA28" />
    </svg>
  );

  const openCustomerSettings = () => {
    setActiveModule('facturacion');
    setEditingHeaderDetails(true);
    setTimeout(scrollToTicket, 50);
  };

  const openLastReceipt = () => {
    if (invoices.length > 0) setInspectingInvoice(invoices[0]);
  };

  const utilityButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-full bg-[#4A3232] text-white transition-transform hover:scale-105 hover:bg-[#5C3D3D]';

  return (
    <div
      className="min-h-dvh w-full lg:p-5"
      style={{
        background:
          'radial-gradient(circle at 92% 50%, rgba(120, 38, 32, 0.42) 0%, rgba(20, 18, 20, 0.98) 55%, #111012 100%)',
      }}
    >
      {/* App Shell: full-bleed on phones/tablets, framed card on desktop */}
      <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col bg-[#1C1C1E] text-zinc-100 lg:h-[calc(100dvh-2.5rem)] lg:min-h-0 lg:flex-row lg:overflow-hidden lg:rounded-[32px] lg:shadow-[0_32px_80px_rgba(0,0,0,0.75)] lg:ring-1 lg:ring-white/5">
        {/* MOBILE / TABLET TOP BAR */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-[#252528]/95 px-4 py-2.5 backdrop-blur-md sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setActiveModule('facturacion')}
            aria-label="Ir a Facturación"
            className="group flex min-w-0 items-center gap-2.5 text-left focus:outline-none"
          >
            {flameLogo('h-9 w-9 shrink-0', 'flameGradMobile')}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                Brasa &amp; Roble
              </p>
              <p className="truncate text-[10px] text-zinc-400">
                {navItems.find((n) => n.id === activeModule)?.label ??
                  'Facturación'}{' '}
                · Caja 01
              </p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openCustomerSettings}
              aria-label="Configurar datos del cliente (cédula / RUC)"
              className={utilityButtonClass}
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openLastReceipt}
              aria-label="Ver última factura emitida"
              className={utilityButtonClass}
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* DESKTOP SIDEBAR with Sculptural Curved Rail (icons on lg, labels on xl) */}
        <aside className="relative hidden w-[96px] shrink-0 flex-col items-stretch justify-between bg-[#252528] py-5 lg:flex xl:w-[215px]">
          <div className="relative z-10 flex justify-center xl:justify-start xl:px-[9px]">
            <button
              type="button"
              onClick={() => setActiveModule('facturacion')}
              aria-label="Ir a Facturación"
              className="group flex items-center gap-2 text-left focus:outline-none"
            >
              {flameLogo('h-12 w-12 shrink-0', 'flameGradDesktop')}
              <span className="hidden text-sm leading-tight font-bold text-white xl:block">
                Brasa &amp;
                <br />
                Roble
              </span>
            </button>
          </div>

          <nav
            aria-label="Navegación del sistema"
            className="relative z-10 my-auto flex flex-col gap-3 py-5"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-[74px] rounded-r-[44px] bg-[#505054] shadow-inner"
            />
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className="group relative z-10 flex items-center gap-3 py-1 text-left"
                >
                  <div className="relative flex w-[74px] shrink-0 items-center justify-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-[#F04E3E]/20 text-[#F04E3E]'
                          : 'text-white/90 group-hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute -right-1.5 h-2.5 w-2.5 rounded-full bg-[#F04E3E] ring-4 ring-[#252528]"
                      />
                    )}
                  </div>
                  <span
                    className={`hidden text-xs font-semibold tracking-wide whitespace-nowrap transition-colors xl:inline ${
                      isActive
                        ? 'text-[#F04E3E]'
                        : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setActiveModule('arqueo')}
              aria-label="Cerrar turno"
              title="Cerrar turno"
              className="group relative z-10 flex items-center gap-3 py-1 text-left"
            >
              <div className="flex w-[74px] shrink-0 items-center justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white/90 group-hover:text-white">
                  <LogOut className="h-5 w-5" />
                </div>
              </div>
              <span className="hidden text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 xl:inline">
                Cerrar Turno
              </span>
            </button>
          </nav>

          <div className="relative z-10 flex flex-col items-center gap-3 xl:flex-row xl:justify-center">
            <button
              type="button"
              onClick={openCustomerSettings}
              aria-label="Configurar datos del cliente (cédula / RUC)"
              title="Configurar cédula / RUC del cliente"
              className={utilityButtonClass}
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openLastReceipt}
              aria-label="Ver última factura emitida"
              title="Ver última factura (RIDE 80mm)"
              className={utilityButtonClass}
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <main
          className={`min-w-0 flex-1 px-4 pt-5 sm:px-6 lg:overflow-y-auto lg:p-7 ${
            activeModule === 'facturacion' && ticketItemsCount > 0
              ? 'pb-40'
              : 'pb-28'
          }`}
        >
          {activeModule === 'facturacion' && (
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,1fr)_380px]">
              {/* LEFT COLUMN: Search + Categories + Popular Dishes */}
              <div className="@container min-w-0 space-y-7 lg:col-start-1 lg:row-start-1">
                {/* 1. Top Pill Search Bar */}
                <div className="relative flex items-center rounded-full border border-zinc-700/80 bg-[#171719] py-1.5 pr-1.5 pl-5 shadow-inner">
                  <input
                    type="search"
                    value={searchPlu}
                    onChange={(e) => setSearchPlu(e.target.value)}
                    aria-label="Buscar plato, código PLU, bebida o combo"
                    placeholder="Buscar plato, PLU o bebida..."
                    className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (searchPlu) setSearchPlu('');
                    }}
                    aria-label={searchPlu ? 'Limpiar búsqueda' : 'Buscar'}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#525257] text-white transition-colors hover:bg-[#636368]"
                  >
                    {searchPlu ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* 2. Categories Section (Circular Gradient Badges) */}
                <section aria-labelledby="pos-categories-heading">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2
                        id="pos-categories-heading"
                        className="text-lg font-bold tracking-tight text-white"
                      >
                        Categorías
                      </h2>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        <span className="font-semibold text-[#F04E3E]">
                          6+ Categorías
                        </span>{' '}
                        activas en terminal de facturación
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCategory('todos')}
                      className="group flex items-center gap-2 text-xs font-semibold text-zinc-200 hover:text-white whitespace-nowrap shrink-0"
                    >
                      <span>Ver Todas</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#525257] text-white transition-transform group-hover:translate-x-0.5">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  </div>

                  {/* Circular Category Icons Row */}
                  <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 @lg:mx-0 @lg:grid @lg:grid-cols-6 @lg:gap-3 @lg:overflow-visible @lg:px-0 lg:mx-0 lg:px-0">
                    {CATEGORY_CIRCLES.map((cat) => {
                      const active = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className="group flex w-[78px] shrink-0 snap-start flex-col items-center text-center focus:outline-none @lg:w-auto"
                        >
                          <div
                            className={`relative flex h-16 w-16 items-center justify-center rounded-full p-1.5 transition-all duration-150 ${
                              active
                                ? 'bg-gradient-to-b from-[#F04E3E] to-[#8E1C13] ring-2 ring-[#F04E3E]/60 scale-105'
                                : 'bg-gradient-to-b from-[#45413E] to-[#282626] hover:scale-105'
                            }`}
                          >
                            {!brokenImages[`cat-${cat.id}`] ? (
                              <img
                                src={cat.imageUrl}
                                alt={cat.label}
                                referrerPolicy="no-referrer"
                                onError={() => markImgBroken(`cat-${cat.id}`)}
                                className="h-12 w-12 rounded-full object-cover shadow-md"
                              />
                            ) : (
                              <span className="text-xs font-bold text-white">
                                {cat.label.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <span
                            className={`mt-2 text-xs font-semibold transition-colors ${
                              active
                                ? 'text-[#F04E3E]'
                                : 'text-zinc-300 group-hover:text-white'
                            }`}
                          >
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* 3. Popular Dishes Section (Floating Cutout Dish Cards) */}
                <section aria-labelledby="pos-dishes-heading">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2
                        id="pos-dishes-heading"
                        className="text-lg font-bold tracking-tight text-white"
                      >
                        Platos Más Vendidos
                      </h2>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        <span className="font-semibold text-[#F04E3E]">
                          {filteredProducts.length} Platos
                        </span>{' '}
                        listos para agregar a la factura con un clic
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAllDishes((v) => !v)}
                      className="group flex items-center gap-2 text-xs font-semibold text-zinc-200 hover:text-white whitespace-nowrap shrink-0"
                    >
                      <span>{showAllDishes ? 'Ver Menos' : 'Ver Catálogo'}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#525257] text-white transition-transform group-hover:translate-x-0.5">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  </div>

                  {/* Floating-Image Dish Cards Grid */}
                  <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-11 @md:grid-cols-3 @md:gap-x-4 @2xl:grid-cols-4">
                    {displayedDishes.map((dish, dishIdx) => {
                      const qtyInCart = activeLines
                        .filter((l) => l.product.id === dish.id)
                        .reduce((sum, l) => sum + l.quantity, 0);
                      return (
                        <button
                          key={dish.id}
                          type="button"
                          onClick={() => handleAddProductToTicket(dish)}
                          aria-label={`Facturar ${dish.shortName} ${formatUSD(dish.price)}`}
                          className={`group relative flex min-w-0 flex-col justify-between rounded-[22px] px-3 pt-12 pb-3 sm:px-3.5 sm:pb-3.5 text-center shadow-lg transition-all duration-150 hover:-translate-y-1 ${
                            qtyInCart > 0
                              ? 'bg-[#342B2B] ring-2 ring-[#F04E3E]'
                              : 'bg-[#2B2B2E] hover:bg-[#333337] hover:ring-1 hover:ring-[#F04E3E]/50'
                          } ${!showAllDishes && dishIdx >= 4 ? '@2xl:hidden' : ''}`}
                        >
                          {/* Badge showing quantity currently in the cart */}
                          {qtyInCart > 0 && (
                            <span className="font-mono-tabular absolute top-2.5 right-2.5 z-10 inline-flex items-center justify-center rounded-full bg-[#F04E3E] px-2 py-0.5 text-[11px] font-extrabold text-white shadow-md">
                              {qtyInCart} en carrito
                            </span>
                          )}

                          {/* Floating Circular Food Photo Overlapping Card Top */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                            <div
                              className={`h-20 w-20 overflow-hidden rounded-full border-2 bg-[#1C1C1E] shadow-[0_10px_20px_rgba(0,0,0,0.65)] transition-transform duration-200 group-hover:scale-105 ${
                                qtyInCart > 0
                                  ? 'border-[#F04E3E]'
                                  : 'border-[#3E3E42]'
                              }`}
                            >
                              {!brokenImages[dish.id] ? (
                                <img
                                  src={dish.imageUrl}
                                  alt={dish.shortName}
                                  referrerPolicy="no-referrer"
                                  onError={() => markImgBroken(dish.id)}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#F04E3E]">
                                  {dish.plu}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-1">
                            <h3 className="truncate text-sm font-bold text-white group-hover:text-[#F04E3E]">
                              {dish.shortName}
                            </h3>
                            <p className="mt-0.5 text-[10px] text-zinc-400">
                              Precio Venta ({dish.plu})
                            </p>
                            <p className="font-mono-tabular mt-1 text-sm font-extrabold text-white">
                              {formatUSD(dish.price)}
                            </p>
                          </div>

                          <div className="mt-3 flex items-end justify-between border-t border-zinc-700/60 pt-2 text-[10px]">
                            <span className="inline-flex items-center gap-1 font-bold text-zinc-200">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {dish.rating.toFixed(1)}
                            </span>
                            <div className="text-right leading-tight">
                              <span className="font-mono-tabular block text-zinc-400">
                                {dish.totalSalesCount}
                              </span>
                              <span className="font-bold text-white">
                                Ventas
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

              </div>

              {/* RIGHT COLUMN (5 Cols on XL): Perforated Ticket / Cart Card matching image_9001ce6d.png */}
              <form
                id="pos-ticket"
                onSubmit={handleEmitInvoice}
                className="relative flex min-w-0 scroll-mt-20 flex-col justify-between overflow-x-hidden rounded-[28px] bg-[#3E3E42] p-5 text-white shadow-2xl lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
              >
                {/* Top Sub-Card: DELIVERY ADDRESS / DATOS DE FACTURA */}
                <div className="rounded-[20px] bg-[#66666B] p-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold tracking-wider text-white uppercase">
                      Cliente y Entrega
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingHeaderDetails((v) => !v)}
                      className="rounded-full bg-black/25 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-black/40"
                    >
                      {editingHeaderDetails ? 'Listo' : 'Editar Cédula / RUC'}
                    </button>
                  </div>

                  {!editingHeaderDetails ? (
                    <div className="mt-2.5 space-y-1.5 text-xs text-zinc-100">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-white" />
                        <span className="truncate">
                          {channel === 'mostrador'
                            ? 'Mostrador · Retiro en Caja'
                            : tableOrAddress ||
                              (channel === 'mesa'
                                ? 'Falta el número de mesa'
                                : 'Falta la dirección de entrega')}
                        </span>
                      </p>
                      <p className="flex items-center gap-2 text-zinc-200">
                        <User className="h-3.5 w-3.5 shrink-0 text-white" />
                        <span className="truncate">
                          {customerName} ({customerTaxId})
                          {customerPhone ? ` · ${customerPhone}` : ''}
                        </span>
                      </p>
                    </div>
                  ) : (
                    /* Inline Customer, ID & Document Type Editor */
                    <div className="mt-3 space-y-2.5 border-t border-white/15 pt-3 text-xs">
                      <div className="grid grid-cols-2 gap-1.5 rounded-full bg-black/25 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDocType('consumidor_final');
                            setCustomerName(CONSUMIDOR_FINAL_NAME);
                            setCustomerTaxId(CONSUMIDOR_FINAL_ID);
                          }}
                          className={`rounded-full py-1 text-[11px] font-bold ${
                            docType === 'consumidor_final'
                              ? 'bg-white text-zinc-900'
                              : 'text-zinc-200'
                          }`}
                        >
                          Consumidor Final
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDocType('con_datos');
                            if (customerTaxId === CONSUMIDOR_FINAL_ID) {
                              setCustomerName('');
                              setCustomerTaxId('');
                            }
                          }}
                          className={`rounded-full py-1 text-[11px] font-bold ${
                            docType === 'con_datos'
                              ? 'bg-[#F04E3E] text-white'
                              : 'text-zinc-200'
                          }`}
                        >
                          Factura con Datos
                        </button>
                      </div>

                      {docType === 'consumidor_final' ? (
                        <p className="rounded-lg bg-black/20 px-2.5 py-1.5 text-[11px] text-zinc-200">
                          Factura a CONSUMIDOR FINAL ({CONSUMIDOR_FINAL_ID}).
                          Máximo {formatUSD(CONSUMIDOR_FINAL_MAX_TOTAL)} por
                          factura según el SRI.
                        </p>
                      ) : (
                      <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label
                            htmlFor="ticket-id-input"
                            className="mb-0.5 block text-[10px] font-semibold text-zinc-200"
                          >
                            Cédula o RUC
                          </label>
                          <input
                            id="ticket-id-input"
                            type="text"
                            inputMode="numeric"
                            maxLength={13}
                            value={customerTaxId}
                            onChange={(e) =>
                              setCustomerTaxId(e.target.value.replace(/\D/g, ''))
                            }
                            placeholder="10 o 13 dígitos"
                            className="font-mono-tabular w-full rounded-lg bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none"
                          />
                          {customerTaxId.length >= 10 && (
                            <p
                              className={`mt-0.5 text-[10px] font-semibold ${
                                taxIdCheck.valid ? 'text-[#7CDB80]' : 'text-[#FFB4A8]'
                              }`}
                            >
                              {taxIdCheck.valid
                                ? taxIdCheck.type === 'ruc'
                                  ? 'RUC válido'
                                  : 'Cédula válida'
                                : taxIdCheck.error}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor="ticket-name-input"
                            className="mb-0.5 block text-[10px] font-semibold text-zinc-200"
                          >
                            Nombres / Razón Social
                          </label>
                          <input
                            id="ticket-name-input"
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Nombre o Empresa"
                            className="w-full rounded-lg bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="ticket-email-input"
                          className="mb-0.5 block text-[10px] font-semibold text-zinc-200"
                        >
                          Correo para la factura electrónica
                        </label>
                        <input
                          id="ticket-email-input"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="cliente@correo.com"
                          className="w-full rounded-lg bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none"
                        />
                      </div>
                      </>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {channel !== 'mostrador' && (
                          <div>
                            <label
                              htmlFor="ticket-address-input"
                              className="mb-0.5 block text-[10px] font-semibold text-zinc-200"
                            >
                              {channel === 'mesa'
                                ? 'Número de Mesa'
                                : 'Dirección de Domicilio'}
                            </label>
                            <input
                              id="ticket-address-input"
                              type="text"
                              value={tableOrAddress}
                              onChange={(e) => setTableOrAddress(e.target.value)}
                              placeholder={
                                channel === 'mesa'
                                  ? 'Ej. Mesa 04'
                                  : 'Ej. Av. 6 de Diciembre N34-120 y Portugal'
                              }
                              className="w-full rounded-lg bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none"
                            />
                          </div>
                        )}
                        <div>
                          <label
                            htmlFor="ticket-phone-input"
                            className="mb-0.5 block text-[10px] font-semibold text-zinc-200"
                          >
                            Teléfono
                          </label>
                          <input
                            id="ticket-phone-input"
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Ej. 099 123 4567"
                            className="font-mono-tabular w-full rounded-lg bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cart Header & Order ID */}
                <div className="mt-5 flex shrink-0 items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-[#F04E3E]" />
                    <span className="text-sm font-bold text-white">
                      Carrito / Factura
                    </span>
                    <span className="font-mono-tabular rounded-full bg-[#F04E3E] px-2 py-0.5 text-[11px] font-extrabold text-white">
                      {ticketItemsCount}{' '}
                      {ticketItemsCount === 1 ? 'ítem' : 'ítems'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeLines.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveLines([]);
                          setBillingError('');
                        }}
                        className="rounded-full bg-black/25 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300 hover:bg-black/40 hover:text-white"
                      >
                        Vaciar
                      </button>
                    )}
                    <span className="font-mono-tabular text-xs text-zinc-300">
                      N° {nextFolioCode}
                    </span>
                  </div>
                </div>

                {/* 3-Way Pill Segmented Control: Delivery | Dine In | Takeaway */}
                <div className="mt-3.5 grid shrink-0 grid-cols-3 items-center rounded-full border border-zinc-400/40 bg-[#323236] p-1">
                  {(
                    [
                      { id: 'domicilio', label: 'Domicilio' },
                      { id: 'mesa', label: 'En Salón' },
                      { id: 'mostrador', label: 'Para Llevar' },
                    ] as const
                  ).map((mode) => {
                    const active = channel === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleChangeChannel(mode.id)}
                        className={`rounded-full py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-gradient-to-r from-[#E53935] to-[#F05545] text-white shadow-md'
                            : 'text-zinc-300 hover:text-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>

                {/* Itemized Cart List (shrink-0 prevents Flexbox from collapsing cart items on short screens) */}
                <div className="mt-4 shrink-0 space-y-2.5 rounded-2xl bg-black/20 p-3">
                  {activeLines.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-300">
                      Selecciona platos del panel central para agregarlos al
                      carrito de facturación.
                    </div>
                  ) : (
                    activeLines.map((line) => (
                      <div
                        key={line.lineId}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[#2B2B2E]/90 px-3 py-2.5 shadow-sm"
                      >
                        {/* Dish Circular Thumbnail with fallback */}
                        {!brokenImages[line.product.id] ? (
                          <img
                            src={line.product.imageUrl}
                            alt={line.product.shortName}
                            referrerPolicy="no-referrer"
                            onError={() => markImgBroken(line.product.id)}
                            className="h-11 w-11 shrink-0 rounded-full object-cover shadow-md"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-[10px] font-bold text-[#F04E3E]">
                            {line.product.plu}
                          </div>
                        )}

                        {/* Title, Subtitle & Circular +/- Steppers */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-bold text-white">
                              {line.product.shortName}
                            </p>
                            <span className="font-mono-tabular shrink-0 text-xs font-extrabold text-[#4CAF50]">
                              {formatUSD(line.subtotal)}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-zinc-300">
                            {line.cutNote} · {formatUSD(line.unitPrice)} c/u
                          </p>

                          <div className="mt-1.5 flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateLineQuantity(line.lineId, -1)
                              }
                              aria-label={`Restar ${line.product.shortName}`}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300/60 text-white hover:bg-white/15"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="font-mono-tabular text-xs font-extrabold text-white">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateLineQuantity(line.lineId, 1)
                              }
                              aria-label={`Sumar ${line.product.shortName}`}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300/60 text-white hover:bg-white/15"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>

                        {/* White Pill Edit Button (cycles cut note) */}
                        <button
                          type="button"
                          onClick={() => handleCycleLineCut(line.lineId)}
                          aria-label={`Cambiar corte de ${line.product.shortName}`}
                          title="Cambiar tipo de corte (8 Presas / 4 Cuartos / Entero / Deshuesado)"
                          className="flex h-7 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm transition-transform hover:scale-105"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* PERFORATED TICKET NOTCH DIVIDER */}
                <div className="relative my-4 flex items-center justify-between">
                  <span
                    aria-hidden="true"
                    className="-ml-8 h-7 w-7 shrink-0 rounded-full bg-[#1C1C1E]"
                  />
                  <div className="w-full border-t-2 border-dashed border-[#242427]" />
                  <span
                    aria-hidden="true"
                    className="-mr-8 h-7 w-7 shrink-0 rounded-full bg-[#1C1C1E]"
                  />
                </div>

                {/* Promotion Code Pill Row */}
                <div className="flex items-center justify-between rounded-full bg-[#4E4E53] py-1.5 pr-1.5 pl-4">
                  <span className="text-xs font-medium text-zinc-200">
                    Código Promoción
                  </span>
                  <button
                    type="button"
                    onClick={handleCyclePromoDiscount}
                    className="rounded-full bg-[#1C1C1E] px-5 py-1.5 text-xs font-extrabold tracking-wider text-white transition-colors hover:bg-black"
                  >
                    {promoCodeLabel}
                  </button>
                </div>

                {/* Compact Payment Method & Cash Change Bar */}
                <div className="mt-3 rounded-2xl bg-black/20 p-3 text-xs">
                  <div className="flex items-center justify-between gap-1.5">
                    {(
                      [
                        { id: 'efectivo', label: 'Efectivo' },
                        { id: 'tarjeta', label: 'Tarjeta' },
                        { id: 'transferencia', label: 'Transferencia' },
                      ] as const
                    ).map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`flex-1 rounded-full py-1 text-[11px] font-semibold transition-colors ${
                          paymentMethod === pm.id
                            ? 'bg-white text-zinc-900'
                            : 'text-zinc-300 hover:text-white'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'efectivo' && (
                    <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2">
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor="pos-cash-input"
                          className="text-[11px] text-zinc-300"
                        >
                          Recibido:
                        </label>
                        <input
                          id="pos-cash-input"
                          type="number"
                          min={0}
                          step={0.01}
                          value={cashReceivedValue}
                          onChange={(e) =>
                            setCashReceivedInput(
                              Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className="font-mono-tabular w-24 rounded-full bg-black/30 px-2.5 py-0.5 text-right text-xs font-bold text-white"
                        />
                      </div>
                      <span className="font-mono-tabular text-[11px] font-bold text-[#4CAF50]">
                        Vuelto:{' '}
                        {cashChange.isSufficient
                          ? formatUSD(cashChange.changeDue)
                          : 'Insuficiente'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sub Total, Delivery Charge & TOTAL */}
                <div className="mt-4 space-y-1.5 px-1 text-xs">
                  <div className="flex justify-between text-zinc-200">
                    <span>
                      Subtotal (Base {formatUSD(currentTotals.netBase)} + IVA 15%)
                    </span>
                    <span className="font-mono-tabular font-semibold text-white">
                      {formatUSD(
                        currentTotals.grossSubtotal - currentTotals.discountAmount
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-200">
                    <span>Recargo Domicilio</span>
                    <span className="font-mono-tabular font-semibold text-white">
                      {formatUSD(currentTotals.deliveryCharge)}
                    </span>
                  </div>

                  <div className="my-2 border-t border-zinc-500/40 pt-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-extrabold tracking-wide text-white uppercase">
                        TOTAL
                      </span>
                      <span className="font-mono-tabular text-lg font-extrabold text-white">
                        {formatUSD(currentTotals.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {billingError && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F04E3E]/20 px-3 py-2 text-xs font-semibold text-white">
                    <AlertCircle className="h-4 w-4 shrink-0 text-[#F04E3E]" />
                    <span>{billingError}</span>
                  </div>
                )}

                {/* Confirm Order Primary Dark Pill Button */}
                <button
                  type="submit"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#2C2C30] to-[#151517] py-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,0,0,0.5)] transition-all hover:from-[#35353A] active:scale-99"
                >
                  <Printer className="h-4 w-4 text-[#F04E3E]" />
                  <span>Confirmar y Emitir Factura</span>
                </button>
              </form>

                {/* 4. Order Reports Section (Recent Invoices Ledger matching bottom table) */}
                <section
                  aria-labelledby="pos-order-reports-heading"
                  className="@container min-w-0 lg:col-start-1 lg:row-start-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2
                        id="pos-order-reports-heading"
                        className="text-lg font-bold tracking-tight text-white"
                      >
                        Reporte de Facturas
                      </h2>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        <span className="font-semibold text-[#F04E3E]">
                          Turno Activo ({invoices.length} facturas)
                        </span>{' '}
                        · Haz clic en el estado para ver o imprimir el comprobante 80mm
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveModule('facturas')}
                      className="group flex items-center gap-2 text-xs font-semibold text-zinc-200 hover:text-white whitespace-nowrap shrink-0"
                    >
                      <span>Ver Libro</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#525257] text-white transition-transform group-hover:translate-x-0.5">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  </div>

                  {/* Table header (only when the column is wide) */}
                  <div className="mt-4 hidden grid-cols-12 items-center gap-3 rounded-full bg-[#2E2E32] px-5 py-2.5 text-xs font-semibold text-zinc-300 @2xl:grid">
                    <div className="col-span-3">Cliente</div>
                    <div className="col-span-3">N° Factura / ID</div>
                    <div className="col-span-3">Dirección / Mesa</div>
                    <div className="col-span-1 text-right">Monto</div>
                    <div className="col-span-2 text-right">Estado</div>
                  </div>

                  {/* Invoice Rows */}
                  <div className="mt-3 space-y-2">
                    {invoices.slice(0, 4).map((inv, idx) => {
                      const avatar = (
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                            idx % 2 === 0
                              ? 'bg-gradient-to-br from-amber-400 to-orange-600'
                              : 'bg-gradient-to-br from-sky-500 to-indigo-600'
                          }`}
                        >
                          {inv.customerName.slice(0, 2).toUpperCase()}
                        </div>
                      );
                      const statusButton = (
                        <button
                          type="button"
                          onClick={() => setInspectingInvoice(inv)}
                          aria-label={`Ver comprobante ${inv.folio}`}
                          className={`rounded-full px-3 py-1 text-[11px] font-bold whitespace-nowrap text-white shadow-sm transition-transform hover:scale-105 ${
                            inv.status === 'emitida' ? 'bg-[#4CAF50]' : 'bg-[#D99B26]'
                          }`}
                        >
                          {inv.status === 'emitida' ? 'Emitida' : 'Anulada'}
                        </button>
                      );
                      return (
                        <div
                          key={inv.id}
                          className="rounded-2xl bg-[#242427] px-4 py-3 transition-colors hover:bg-[#2B2B2E] @2xl:py-2.5"
                        >
                          {/* Compact card */}
                          <div className="flex items-center gap-3 @2xl:hidden">
                            {avatar}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-white">
                                {inv.customerName}
                              </p>
                              <p className="font-mono-tabular truncate text-[11px] text-zinc-400">
                                {inv.folio}
                              </p>
                              <p className="truncate text-[11px] text-zinc-500">
                                {inv.tableOrAddress}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              <span className="font-mono-tabular text-sm font-bold text-white">
                                {formatUSD(inv.totals.grandTotal)}
                              </span>
                              {statusButton}
                            </div>
                          </div>

                          {/* Table row */}
                          <div className="hidden grid-cols-12 items-center gap-3 @2xl:grid">
                            <div className="col-span-3 flex min-w-0 items-center gap-2.5">
                              {avatar}
                              <span className="truncate text-xs font-semibold text-white">
                                {inv.customerName}
                              </span>
                            </div>
                            <div className="font-mono-tabular col-span-3 min-w-0 text-[11px]">
                              <p className="truncate font-bold text-white">{inv.folio}</p>
                              <p className="truncate text-zinc-400">{inv.customerTaxId}</p>
                            </div>
                            <div className="col-span-3 truncate text-[11px] text-zinc-300">
                              {inv.tableOrAddress}
                            </div>
                            <div className="font-mono-tabular col-span-1 text-right text-xs font-bold text-white">
                              {formatUSD(inv.totals.grandTotal)}
                            </div>
                            <div className="col-span-2 flex justify-end">{statusButton}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
            </div>
          )}

          {activeModule === 'facturas' && (
            <InvoiceHistoryView
              invoices={invoices}
              onInspectInvoice={(inv) => setInspectingInvoice(inv)}
              onCancelInvoice={handleCancelInvoice}
              onGoToBilling={() => setActiveModule('facturacion')}
            />
          )}

          {activeModule === 'inventario' && (
            <ChickenKardexView
              products={products}
              invoices={invoices}
              wholeChickensLoaded={wholeChickensLoaded}
              shrinkageQuarters={shrinkageQuarters}
              onAddWholeChickensBatch={handleAddWholeChickensBatch}
              onRegisterShrinkageQuarter={handleRegisterShrinkageQuarter}
              onRestockProduct={handleRestockProduct}
            />
          )}

          {activeModule === 'arqueo' && (
            <CashRegisterCloseView
              invoices={invoices}
              expenses={expenses}
              openingCash={openingCash}
              onAddExpense={handleAddExpense}
            />
          )}

          {activeModule === 'contabilidad' && (
            <AccountingView
              invoices={invoices}
              expenses={expenses}
              openingCash={openingCash}
              purchases={purchases}
              manualEntries={manualEntries}
              payroll={payroll}
              onAddPurchase={handleAddPurchase}
              onMarkPurchasePaid={handleMarkPurchasePaid}
              onAddManualEntry={handleAddManualEntry}
              onTogglePayrollPaid={handleTogglePayrollPaid}
              onAddOvertimeHour={handleAddOvertimeHour}
              onAddEmployee={handleAddEmployee}
            />
          )}
        </main>

        {/* MOBILE / TABLET BOTTOM NAVIGATION */}
        <nav
          aria-label="Navegación del sistema"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-[#202022]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-0 flex-col items-center gap-1 px-0.5 py-2 text-[10px] sm:text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-[#F04E3E]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span
                  className={`flex h-8 w-10 sm:w-12 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-[#F04E3E]/15' : ''
                  }`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* MOBILE / TABLET quick access to the current order */}
        {activeModule === 'facturacion' && ticketItemsCount > 0 && !ticketInView && (
          <button
            type="button"
            onClick={scrollToTicket}
            className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full bg-gradient-to-r from-[#E53935] to-[#F05545] py-2.5 pr-2.5 pl-5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(229,57,53,0.45)] lg:hidden"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ver pedido · {ticketItemsCount} {ticketItemsCount === 1 ? 'ítem' : 'ítems'}
            </span>
            <span className="font-mono-tabular rounded-full bg-black/20 px-3 py-1">
              {formatUSD(currentTotals.grandTotal)}
            </span>
          </button>
        )}
      </div>

      {/* 80mm Thermal Receipt & Kitchen Comanda Modal */}
      {inspectingInvoice && (
        <ThermalReceiptModal
          invoice={inspectingInvoice}
          onClose={() => setInspectingInvoice(null)}
        />
      )}
    </div>
  );
}
