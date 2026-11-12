/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  UtensilsCrossed,
  ClipboardList,
  MapPin,
  Flame,
  Wallet,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Pencil,
  SlidersHorizontal,
  Check,
  Tag,
  Printer,
  AlertCircle,
  User,
  X,
  BookOpen,
  Star,
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

const BUILD_MEAL_EXTRAS = [
  {
    id: 'papas',
    label: 'Papas',
    weight: '180g',
    imageUrl: '/assets/images/acompanamientos_criollos_1794335777748.jpg',
  },
  {
    id: 'aji',
    label: 'Ají Casa',
    weight: '4oz',
    imageUrl: '/assets/images/hero_pollo_brasa_1794335771940.jpg',
  },
  {
    id: 'ensalada',
    label: 'Ensalada',
    weight: '120g',
    imageUrl: '/assets/images/combo_familiar_brasa_1794335773635.jpg',
  },
  {
    id: 'menestra',
    label: 'Menestra',
    weight: '160g',
    imageUrl: '/assets/images/medio_pollo_artesanal_1794335775071.jpg',
  },
] as const;

const PORTION_WEIGHT_LABELS: Record<string, string> = {
  '8 Presas (Tradicional)': '8 Presas · 1.4kg',
  '4 Cuartos': '4 Cuartos · 1.4kg',
  'Entero sin cortar': 'Entero · 1.4kg',
  Deshuesado: 'Fileteado · 1.1kg',
};

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
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [showAllDishes, setShowAllDishes] = useState<boolean>(false);
  const [editingHeaderDetails, setEditingHeaderDetails] =
    useState<boolean>(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Dishly Hero Configurator State
  const [featuredProductId, setFeaturedProductId] = useState<string>(
    INITIAL_POS_PRODUCTS[0].id
  );
  const [heroCut, setHeroCut] = useState<string>(CUT_PRESETS[0]);
  const [heroQuantity, setHeroQuantity] = useState<number>(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([
    'papas',
    'aji',
    'ensalada',
  ]);

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
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [promoCodeLabel, setPromoCodeLabel] = useState<string>('brasa10');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [cashReceivedInput, setCashReceivedInput] = useState<number | null>(
    null
  );
  const [billingError, setBillingError] = useState<string>('');

  // Seed 3 items in the active Cart/Ticket matching the Dishly reference layout
  const [activeLines, setActiveLines] = useState<InvoiceLineItem[]>([
    {
      lineId: 'seed-line-1',
      product: INITIAL_POS_PRODUCTS[0], // Pollo Entero Brasa ($14.00)
      quantity: 1,
      unitPrice: INITIAL_POS_PRODUCTS[0].price,
      cutNote: CUT_PRESETS[0],
      subtotal: INITIAL_POS_PRODUCTS[0].price,
    },
    {
      lineId: 'seed-line-2',
      product: INITIAL_POS_PRODUCTS[3], // Costillas a la Leña ($9.50)
      quantity: 1,
      unitPrice: INITIAL_POS_PRODUCTS[3].price,
      cutNote: '450g · Leña Roble',
      subtotal: INITIAL_POS_PRODUCTS[3].price,
    },
    {
      lineId: 'seed-line-3',
      product: INITIAL_POS_PRODUCTS[12], // Jarra Naranjilla 1L ($3.50)
      quantity: 1,
      unitPrice: INITIAL_POS_PRODUCTS[12].price,
      cutNote: '1.0L · Fruta Natural',
      subtotal: INITIAL_POS_PRODUCTS[12].price,
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

  // Keep featuredProductId synced when filtering categories
  const featuredProduct = useMemo(() => {
    const found = products.find((p) => p.id === featuredProductId);
    if (found && (selectedCategory === 'todos' || found.category === selectedCategory)) {
      return found;
    }
    return filteredProducts[0] ?? products[0];
  }, [products, featuredProductId, selectedCategory, filteredProducts]);

  // Pairings / Catalog list below Hero
  const pairingDishes = useMemo(() => {
    const others = filteredProducts.filter((p) => p.id !== featuredProduct.id);
    const list = others.length > 0 ? others : products.filter((p) => p.id !== featuredProduct.id);
    return showAllDishes ? list : list.slice(0, 6);
  }, [filteredProducts, products, featuredProduct.id, showAllDishes]);

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

  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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

  // Add product to right-hand ticket with custom quantity and cut note
  const handleAddProductToTicket = (
    product: PosProduct,
    qtyToAdd: number = 1,
    customCut?: string
  ) => {
    const cutToUse =
      customCut ?? (product.requiresCut ? CUT_PRESETS[0] : product.subtitle.slice(0, 22));
    const existingIndex = activeLines.findIndex(
      (l) => l.product.id === product.id && l.cutNote === cutToUse
    );

    let updatedLines: InvoiceLineItem[];
    if (existingIndex > -1) {
      const target = activeLines[existingIndex];
      const nextQty = target.quantity + qtyToAdd;
      const incremented: InvoiceLineItem = {
        ...target,
        quantity: nextQty,
        subtotal: roundUSD(nextQty * target.unitPrice),
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
          quantity: qtyToAdd,
          unitPrice: product.price,
          cutNote: cutToUse,
          subtotal: roundUSD(product.price * qtyToAdd),
        },
        ...activeLines,
      ];
    }

    tryUpdateLines(updatedLines);
  };

  const handleAddHeroDishToOrder = () => {
    const extrasNames = BUILD_MEAL_EXTRAS.filter((e) =>
      selectedExtras.includes(e.id)
    ).map((e) => e.label);
    const baseCut = featuredProduct.requiresCut ? heroCut : 'Porción Estándar';
    const noteWithExtras =
      extrasNames.length > 0
        ? `${baseCut} + ${extrasNames.slice(0, 2).join(', ')}`
        : baseCut;

    handleAddProductToTicket(featuredProduct, heroQuantity, noteWithExtras);
    setHeroQuantity(1);
  };

  const handleSelectDishForHero = (dish: PosProduct) => {
    setFeaturedProductId(dish.id);
    setHeroQuantity(1);
    setHeroCut(CUT_PRESETS[0]);
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

  const handleChangeChannel = (next: ServiceChannel) => {
    if (next === channel) return;
    setChannel(next);
    setTableOrAddress('');
    setBillingError('');
    if (next !== 'mostrador') setEditingHeaderDetails(true);
  };

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

  const handleCyclePromoDiscount = () => {
    if (discountPercent === 10) {
      setDiscountPercent(5);
      setPromoCodeLabel('roble5');
    } else if (discountPercent === 5) {
      setDiscountPercent(0);
      setPromoCodeLabel('sin promo');
    } else {
      setDiscountPercent(10);
      setPromoCodeLabel('brasa10');
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

    setProducts((prev) => applyLinesToStock(prev, activeLines, -1));
    setInvoices((prev) => [newInvoice, ...prev]);
    setInspectingInvoice(newInvoice);

    setActiveLines([]);
    setDiscountPercent(0);
    setPromoCodeLabel('sin promo');
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
    { id: 'facturacion', label: 'Platos Principales', icon: UtensilsCrossed },
    { id: 'facturas', label: 'Libro Facturas', icon: ClipboardList },
    { id: 'inventario', label: 'Asadores', icon: Flame },
    { id: 'arqueo', label: 'Caja y Turno', icon: Wallet },
    { id: 'contabilidad', label: 'Contabilidad', icon: BookOpen },
  ];

  const ticketItemsCount = activeLines.reduce((sum, l) => sum + l.quantity, 0);

  const scrollToTicket = () => {
    setActiveModule('facturacion');
    setTimeout(() => {
      document
        .getElementById('pos-ticket')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  return (
    <div className="min-h-dvh w-full bg-[#E6E7EE] px-2 py-2 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
      {/* Framed Dishly App Container */}
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] max-w-[1440px] flex-col rounded-[28px] bg-[#F4F5F9] p-2.5 text-[#111318] shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-white sm:min-h-[calc(100dvh-2rem)] sm:rounded-[34px] sm:p-4 lg:p-5">
        {/* =====================================================================
            TOP HORIZONTAL NAVIGATION BAR (Dishly Header)
           ===================================================================== */}
        <header className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white bg-[#F9FAFC]/95 px-4 py-2.5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-md sm:px-6">
          {/* Left: Brand Title */}
          <button
            type="button"
            onClick={() => setActiveModule('facturacion')}
            className="flex items-center gap-2 text-left focus:outline-none"
          >
            <span className="text-lg font-extrabold tracking-tight text-[#E11D2E] sm:text-xl">
              Brasa &amp; Roble
            </span>
          </button>

          {/* Center: Horizontal Category / Module Pills (Desktop) */}
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1.5 lg:flex xl:gap-2"
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
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-[#E11D2E] shadow-[0_3px_12px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/60'
                      : 'text-zinc-600 hover:bg-white/60 hover:text-zinc-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-[#E11D2E]' : 'text-zinc-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Search + SRI Settings + Red Cart Pill */}
          <div className="flex items-center gap-2.5">
            {searchOpen ? (
              <div className="flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 shadow-inner">
                <Search className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="search"
                  value={searchPlu}
                  onChange={(e) => {
                    setSearchPlu(e.target.value);
                    if (activeModule !== 'facturacion') {
                      setActiveModule('facturacion');
                    }
                  }}
                  placeholder="Buscar plato o PLU..."
                  className="w-32 bg-transparent text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none sm:w-44"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchPlu('');
                    setSearchOpen(false);
                  }}
                  aria-label="Cerrar búsqueda"
                  className="ml-1 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveModule('facturacion');
                  setSearchOpen(true);
                }}
                aria-label="Buscar plato o código PLU"
                title="Buscar plato o código PLU"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-white hover:shadow-xs"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={scrollToTicket}
              className="inline-flex items-center gap-2 rounded-full bg-[#E11D2E] px-4 py-2 text-xs font-bold text-white shadow-[0_6px_16px_rgba(225,29,46,0.28)] transition-transform hover:scale-102 hover:bg-[#C81625]"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Carrito</span>
              {ticketItemsCount > 0 && (
                <span className="font-mono-tabular rounded-full bg-white/20 px-1.5 py-0.2 text-[11px] font-extrabold text-white">
                  {ticketItemsCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* =====================================================================
            MAIN WORKSPACE CONTENT
           ===================================================================== */}
        <main className="mt-3.5 flex-1 pb-24 lg:pb-2">
          {activeModule === 'facturacion' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px]">
              {/* ===============================================================
                  LEFT WHITE PANEL: Meal Category + Hero Dish + Recommended Pairings
                 =============================================================== */}
              <div className="flex min-w-0 flex-col justify-between rounded-[26px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] sm:p-7">
                <div>
                  {/* 1. Meal Category Header & Filter Icon */}
                  <div className="flex items-center justify-between gap-2">
                    <h1 className="text-base font-extrabold tracking-tight text-zinc-900 sm:text-lg">
                      Categoría de Platos
                    </h1>
                    <button
                      type="button"
                      onClick={() => setShowAllDishes((v) => !v)}
                      title="Mostrar u ocultar catálogo completo"
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-[#E11D2E] transition-colors hover:bg-red-50"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {showAllDishes ? 'Vista Compacta' : 'Ver Todos (14)'}
                      </span>
                    </button>
                  </div>

                  {/* 2. Horizontal Category Pills Row (Black active pill matching Dishly) */}
                  <div className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto pb-1">
                    {CATEGORY_CIRCLES.map((cat) => {
                      const active = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                            active
                              ? 'bg-[#111318] text-white shadow-xs'
                              : 'bg-[#F5F6FA] text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}

                    {/* Quick dish pills for fast switching */}
                    {filteredProducts.slice(0, 3).map((dish) => {
                      const isFeatured = featuredProduct.id === dish.id;
                      return (
                        <button
                          key={`pill-${dish.id}`}
                          type="button"
                          onClick={() => handleSelectDishForHero(dish)}
                          className={`hidden rounded-full px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 xl:inline-flex ${
                            isFeatured
                              ? 'bg-red-50 font-bold text-[#E11D2E] ring-1 ring-[#E11D2E]/30'
                              : 'bg-[#F5F6FA] text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          {dish.shortName}
                        </button>
                      );
                    })}
                  </div>

                  {/* 3. HERO DISH CONFIGURATOR (Centerpiece matching "Rotini Delight") */}
                  <div className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-12 lg:gap-8">
                    {/* Left Circular High-Impact Plate Photo */}
                    <div className="relative flex justify-center md:col-span-5">
                      <div className="relative">
                        {/* Decorative warm glow behind plate */}
                        <div
                          aria-hidden="true"
                          className="absolute -inset-3 rounded-full bg-gradient-to-tr from-amber-100/70 via-red-50/50 to-emerald-50/60 blur-xl"
                        />
                        <div className="relative h-52 w-52 overflow-hidden rounded-full border-[10px] border-[#F6F7FB] bg-zinc-100 shadow-[0_24px_50px_rgba(15,23,42,0.16)] sm:h-64 sm:w-64 xl:h-72 xl:w-72">
                          {!brokenImages[featuredProduct.id] ? (
                            <img
                              src={featuredProduct.imageUrl}
                              alt={featuredProduct.shortName}
                              referrerPolicy="no-referrer"
                              onError={() => markImgBroken(featuredProduct.id)}
                              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-extrabold text-[#E11D2E]">
                              {featuredProduct.plu}
                            </div>
                          )}
                        </div>

                        {/* Floating Rating & Stock Pill */}
                        <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200/80 bg-white px-3 py-1 text-[11px] font-bold text-zinc-800 shadow-md">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{featuredProduct.rating.toFixed(1)}</span>
                          <span className="text-zinc-300">·</span>
                          <span className="font-mono-tabular text-zinc-500">
                            {featuredProduct.plu}
                          </span>
                          <span className="text-zinc-300">·</span>
                          <span className="text-emerald-600">
                            {featuredProduct.stockUnits} disp.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Dish Details, Cut Size, Build Your Meal & Add to Order */}
                    <div className="space-y-4 md:col-span-7">
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
                          {featuredProduct.shortName}
                        </h2>
                        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-zinc-500 sm:text-sm">
                          {featuredProduct.name}. {featuredProduct.subtitle},
                          asado lentamente a las brasas de carbón de roble con
                          adobo artesanal de la casa.
                        </p>
                      </div>

                      {/* SIZE / CORTE PILLS */}
                      <div>
                        <span className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                          Corte y Presentación
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {CUT_PRESETS.map((cut) => {
                            const isSelected = heroCut === cut;
                            return (
                              <button
                                key={cut}
                                type="button"
                                onClick={() => setHeroCut(cut)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                                  isSelected
                                    ? 'bg-[#111318] text-white shadow-xs'
                                    : 'border border-dashed border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500'
                                }`}
                              >
                                {PORTION_WEIGHT_LABELS[cut] ?? cut}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* BUILD YOUR MEAL / COMPLEMENTOS */}
                      <div>
                        <span className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                          Arma tu Pedido (Guarniciones en Comanda)
                        </span>
                        <div className="mt-2 flex flex-wrap gap-3 pb-2">
                          {BUILD_MEAL_EXTRAS.map((extra) => {
                            const checked = selectedExtras.includes(extra.id);
                            return (
                              <button
                                key={extra.id}
                                type="button"
                                onClick={() => toggleExtra(extra.id)}
                                className={`group relative flex w-20 flex-col items-center rounded-2xl border border-dashed p-2.5 pb-4 text-center transition-all ${
                                  checked
                                    ? 'border-zinc-400 bg-[#FAFBFD] shadow-2xs'
                                    : 'border-zinc-200 bg-white opacity-65 hover:opacity-100'
                                }`}
                              >
                                <img
                                  src={extra.imageUrl}
                                  alt={extra.label}
                                  referrerPolicy="no-referrer"
                                  className="h-10 w-10 rounded-full object-cover shadow-xs"
                                />
                                <span className="mt-1.5 text-[11px] font-bold text-zinc-800">
                                  {extra.label}
                                </span>
                                <span className="text-[9px] text-zinc-400">
                                  {extra.weight}
                                </span>

                                {/* Circular Checkmark Badge overlapping bottom border */}
                                <span
                                  className={`absolute -bottom-2.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full transition-colors ${
                                    checked
                                      ? 'bg-[#111318] text-white shadow-xs'
                                      : 'border border-zinc-300 bg-white text-transparent'
                                  }`}
                                >
                                  <Check className="h-3 w-3 stroke-[3]" />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* QUANTITY STEPPER + SPLIT BLACK "ADD TO ORDER" PILL */}
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        {/* + 1 - Stepper */}
                        <div className="inline-flex items-center gap-3 rounded-full bg-[#F4F5F9] px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setHeroQuantity((q) => Math.min(20, q + 1))
                            }
                            aria-label="Aumentar cantidad"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-200"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-mono-tabular min-w-4 text-center text-sm font-extrabold text-zinc-900">
                            {heroQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setHeroQuantity((q) => Math.max(1, q - 1))
                            }
                            aria-label="Disminuir cantidad"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-200"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Split Black Pill Button: "$14.00 | Agregar al pedido" */}
                        <button
                          type="button"
                          onClick={handleAddHeroDishToOrder}
                          className="inline-flex items-center gap-4 rounded-full bg-[#111318] px-6 py-3 text-xs font-bold text-white shadow-[0_10px_24px_rgba(17,19,24,0.22)] transition-all hover:bg-zinc-800 active:scale-98 sm:text-sm"
                        >
                          <span className="font-mono-tabular font-extrabold">
                            {formatUSD(featuredProduct.price * heroQuantity)}
                          </span>
                          <span
                            aria-hidden="true"
                            className="h-4 w-px bg-white/25"
                          />
                          <span>Agregar al pedido</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. RECOMMENDED PAIRINGS / FULL MENU GRID (Bottom of Left Panel) */}
                <div className="mt-8 border-t border-zinc-100 pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">
                      Acompañamientos Recomendados y Menú ({pairingDishes.length}{' '}
                      platos)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllDishes((v) => !v)}
                      className="text-xs font-bold text-zinc-600 hover:text-[#E11D2E]"
                    >
                      {showAllDishes
                        ? 'Mostrar recomendados (6)'
                        : `Ver menú completo (${products.length})`}
                    </button>
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {pairingDishes.map((dish) => {
                      const qtyInCart = activeLines
                        .filter((l) => l.product.id === dish.id)
                        .reduce((sum, l) => sum + l.quantity, 0);

                      return (
                        <div
                          key={dish.id}
                          className={`group relative flex items-center justify-between gap-3 rounded-[20px] border border-dashed p-3 transition-all ${
                            qtyInCart > 0
                              ? 'border-[#E11D2E]/50 bg-red-50/20'
                              : 'border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-sm'
                          }`}
                        >
                          {/* Clicking the photo/title loads this dish into the Hero Configurator */}
                          <button
                            type="button"
                            onClick={() => handleSelectDishForHero(dish)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
                          >
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-zinc-100 bg-zinc-100 shadow-xs">
                              {!brokenImages[dish.id] ? (
                                <img
                                  src={dish.imageUrl}
                                  alt={dish.shortName}
                                  referrerPolicy="no-referrer"
                                  onError={() => markImgBroken(dish.id)}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#E11D2E]">
                                  {dish.plu}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-extrabold text-zinc-900 group-hover:text-[#E11D2E]">
                                {dish.shortName}
                              </p>
                              <p className="truncate text-[11px] text-zinc-400">
                                {dish.subtitle}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="font-mono-tabular text-xs font-extrabold text-[#E11D2E]">
                                  {formatUSD(dish.price)}
                                </span>
                                {qtyInCart > 0 && (
                                  <span className="rounded-full bg-[#E11D2E]/10 px-2 py-0.2 text-[10px] font-bold text-[#E11D2E]">
                                    {qtyInCart} en orden
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Direct + Button to add straight to My Order */}
                          <button
                            type="button"
                            onClick={() => handleAddProductToTicket(dish, 1)}
                            aria-label={`Agregar ${dish.shortName} al pedido`}
                            title="Agregar directamente al pedido"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111318] text-white shadow-xs transition-all hover:scale-105 hover:bg-[#E11D2E]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ===============================================================
                  RIGHT WHITE PANEL: "My Order" / "Mi Pedido" Card
                 =============================================================== */}
              <form
                id="pos-ticket"
                onSubmit={handleEmitInvoice}
                className="flex min-w-0 scroll-mt-20 flex-col justify-between rounded-[26px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] sm:p-6 lg:self-start"
              >
                <div>
                  {/* 1. My Order Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-extrabold text-zinc-900">
                      Mi Pedido
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-400">
                        {ticketItemsCount}{' '}
                        {ticketItemsCount === 1 ? 'posición' : 'posiciones'}
                      </span>
                      {activeLines.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveLines([]);
                            setBillingError('');
                          }}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 hover:bg-red-50 hover:text-[#E11D2E]"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. Compact SRI Customer & Delivery Channel Bar */}
                  <div className="mt-3 rounded-2xl border border-zinc-200/80 bg-[#F8F9FC] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-zinc-800">
                        <User className="h-3.5 w-3.5 shrink-0 text-[#E11D2E]" />
                        <span className="truncate">{customerName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingHeaderDetails((v) => !v)}
                        className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#E11D2E] shadow-2xs ring-1 ring-zinc-200 hover:bg-red-50"
                      >
                        {editingHeaderDetails
                          ? 'Cerrar datos'
                          : 'Datos SRI / Mesa'}
                      </button>
                    </div>

                    {/* 3-Way Channel Pills */}
                    <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-full bg-zinc-200/70 p-1">
                      {(
                        [
                          { id: 'domicilio', label: 'Domicilio' },
                          { id: 'mesa', label: 'En Salón' },
                          { id: 'mostrador', label: 'Llevar' },
                        ] as const
                      ).map((mode) => {
                        const active = channel === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => handleChangeChannel(mode.id)}
                            className={`rounded-full py-1 text-[11px] font-bold transition-all ${
                              active
                                ? 'bg-[#111318] text-white shadow-2xs'
                                : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                          >
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>

                    {editingHeaderDetails && (
                      <div className="mt-3 space-y-2.5 border-t border-zinc-200 pt-2.5 text-xs">
                        <div className="grid grid-cols-2 gap-1 rounded-full bg-zinc-200/70 p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDocType('consumidor_final');
                              setCustomerName(CONSUMIDOR_FINAL_NAME);
                              setCustomerTaxId(CONSUMIDOR_FINAL_ID);
                            }}
                            className={`rounded-full py-1 text-[11px] font-bold ${
                              docType === 'consumidor_final'
                                ? 'bg-white text-zinc-900 shadow-2xs'
                                : 'text-zinc-600'
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
                                ? 'bg-[#E11D2E] text-white shadow-2xs'
                                : 'text-zinc-600'
                            }`}
                          >
                            Factura con Datos
                          </button>
                        </div>

                        {docType === 'con_datos' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label
                                htmlFor="ticket-id-input"
                                className="mb-0.5 block text-[10px] font-bold text-zinc-500"
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
                                  setCustomerTaxId(
                                    e.target.value.replace(/\D/g, '')
                                  )
                                }
                                placeholder="10 o 13 dígitos"
                                className="font-mono-tabular w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-[#E11D2E] focus:outline-none"
                              />
                              {customerTaxId.length >= 10 && (
                                <p
                                  className={`mt-0.5 text-[10px] font-bold ${
                                    taxIdCheck.valid
                                      ? 'text-emerald-600'
                                      : 'text-[#E11D2E]'
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
                                className="mb-0.5 block text-[10px] font-bold text-zinc-500"
                              >
                                Razón Social
                              </label>
                              <input
                                id="ticket-name-input"
                                type="text"
                                value={customerName}
                                onChange={(e) =>
                                  setCustomerName(e.target.value)
                                }
                                placeholder="Nombre cliente"
                                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-[#E11D2E] focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {channel !== 'mostrador' && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            <input
                              type="text"
                              value={tableOrAddress}
                              onChange={(e) =>
                                setTableOrAddress(e.target.value)
                              }
                              placeholder={
                                channel === 'mesa'
                                  ? 'Ej. Mesa 04 · Salón'
                                  : 'Dirección de entrega...'
                              }
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-[#E11D2E] focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Itemized Order Cards (Dashed border cards matching Dishly "My Order") */}
                  <div className="mt-4 shrink-0 space-y-2.5">
                    {activeLines.length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-zinc-200 bg-[#FAFBFD] py-8 text-center text-xs text-zinc-400">
                        Tu pedido está vacío. Selecciona un plato para comenzar.
                      </div>
                    ) : (
                      activeLines.map((line) => (
                        <div
                          key={line.lineId}
                          className="flex items-center gap-3 rounded-[20px] border border-dashed border-zinc-200/90 bg-white p-2.5 shadow-2xs transition-colors hover:border-zinc-300"
                        >
                          {/* Circular Dish Photo */}
                          {!brokenImages[line.product.id] ? (
                            <img
                              src={line.product.imageUrl}
                              alt={line.product.shortName}
                              referrerPolicy="no-referrer"
                              onError={() => markImgBroken(line.product.id)}
                              className="h-14 w-14 shrink-0 rounded-full object-cover shadow-xs"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-[#E11D2E]">
                              {line.product.plu}
                            </div>
                          )}

                          {/* Dish Info + Red Price & Stepper Row */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-1">
                              <p className="truncate text-xs font-extrabold text-zinc-900">
                                {line.product.shortName}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleCycleLineCut(line.lineId)}
                                title="Cambiar corte"
                                className="text-zinc-400 hover:text-zinc-700"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="truncate text-[11px] text-zinc-400">
                              {line.cutNote}
                            </p>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="font-mono-tabular text-xs font-extrabold text-[#E11D2E]">
                                {formatUSD(line.subtotal)}
                              </span>

                              {/* Dishly + 1 - Capsule Stepper */}
                              <div className="inline-flex items-center gap-2 rounded-full bg-[#F4F5F9] px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateLineQuantity(line.lineId, 1)
                                  }
                                  aria-label={`Sumar ${line.product.shortName}`}
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-zinc-700 shadow-2xs hover:bg-zinc-200"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                                <span className="font-mono-tabular min-w-3 text-center text-xs font-extrabold text-zinc-900">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateLineQuantity(line.lineId, -1)
                                  }
                                  aria-label={`Restar ${line.product.shortName}`}
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-zinc-700 shadow-2xs hover:bg-zinc-200"
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Bottom Order Summary, Promo Code, Payment & Confirm Button */}
                <div className="mt-5">
                  {/* PROMOCODE Row with Dashed Dividers */}
                  <div className="flex items-center justify-between border-y border-dashed border-zinc-200 py-3">
                    <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                      Promocode
                    </span>
                    <button
                      type="button"
                      onClick={handleCyclePromoDiscount}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F5F9] px-3 py-1 text-xs font-bold text-zinc-900 transition-colors hover:bg-zinc-200"
                    >
                      <Tag className="h-3 w-3 text-[#111318]" />
                      <span>{promoCodeLabel}</span>
                      <span className="text-zinc-400">×</span>
                    </button>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                        Descuento
                      </span>
                      <span className="font-mono-tabular font-bold text-zinc-700">
                        -{discountPercent}% ({formatUSD(currentTotals.discountAmount)})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                        Domicilio
                      </span>
                      <span className="font-mono-tabular font-bold text-zinc-700">
                        {currentTotals.deliveryCharge === 0
                          ? 'GRATIS'
                          : formatUSD(currentTotals.deliveryCharge)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                        Base + IVA (15%)
                      </span>
                      <span className="font-mono-tabular text-[11px] font-medium text-zinc-500">
                        {formatUSD(currentTotals.netBase)} +{' '}
                        {formatUSD(currentTotals.ivaTax)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs font-extrabold tracking-wider text-zinc-900 uppercase">
                        Total
                      </span>
                      <span className="font-mono-tabular text-lg font-extrabold text-zinc-900">
                        {formatUSD(currentTotals.grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="mt-3.5 rounded-2xl bg-[#F4F5F9] p-2.5 text-xs">
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'efectivo', label: 'Efectivo' },
                          { id: 'tarjeta', label: 'Tarjeta' },
                          { id: 'transferencia', label: 'Transf.' },
                        ] as const
                      ).map((pm) => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`rounded-full py-1 text-[11px] font-bold transition-all ${
                            paymentMethod === pm.id
                              ? 'bg-white text-zinc-900 shadow-2xs'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === 'efectivo' && (
                      <div className="mt-2 flex items-center justify-between border-t border-zinc-200/80 pt-2">
                        <div className="flex items-center gap-1.5">
                          <label
                            htmlFor="pos-cash-input"
                            className="text-[11px] font-medium text-zinc-500"
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
                            className="font-mono-tabular w-20 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-right text-xs font-bold text-zinc-900"
                          />
                        </div>
                        <span className="font-mono-tabular text-[11px] font-bold text-emerald-600">
                          Vuelto:{' '}
                          {cashChange.isSufficient
                            ? formatUSD(cashChange.changeDue)
                            : 'Insuficiente'}
                        </span>
                      </div>
                    )}
                  </div>

                  {billingError && (
                    <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-[#E11D2E]">
                      <AlertCircle className="h-4 w-4 shrink-0 text-[#E11D2E]" />
                      <span>{billingError}</span>
                    </div>
                  )}

                  {/* Primary Red Pill CTA Button ("Confirm Order") */}
                  <button
                    type="submit"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#E11D2E] py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(225,29,46,0.3)] transition-all hover:bg-[#C81625] active:scale-99"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Confirmar Pedido ({ nextFolioCode.slice(-4) })</span>
                  </button>
                </div>
              </form>
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
          aria-label="Navegación móvil"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
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
                className={`flex min-w-0 flex-col items-center gap-1 px-0.5 py-2 text-[10px] font-bold transition-colors sm:text-[11px] ${
                  isActive
                    ? 'text-[#E11D2E]'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <span
                  className={`flex h-7 w-10 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-red-50' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* MOBILE / TABLET quick access to the current order */}
        {activeModule === 'facturacion' &&
          ticketItemsCount > 0 &&
          !ticketInView && (
            <button
              type="button"
              onClick={scrollToTicket}
              className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full bg-[#E11D2E] py-2.5 pr-2.5 pl-5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(225,29,46,0.4)] lg:hidden"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Ver pedido · {ticketItemsCount}{' '}
                {ticketItemsCount === 1 ? 'ítem' : 'ítems'}
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
