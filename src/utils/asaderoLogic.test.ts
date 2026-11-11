import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatUSD,
  calculateInvoiceTotals,
  calculateCashChange,
  validateInvoiceEmission,
  calculateCashReconciliation,
  calculateChickenKardex,
  getNextInvoiceNumber,
  checkStockAvailability,
  applyLinesToStock,
  validateEcuadorianId,
  generateAccessKey,
  mod11CheckDigit,
  BUSINESS_INFO,
  CONSUMIDOR_FINAL_ID,
  INITIAL_POS_PRODUCTS,
  INITIAL_INVOICES,
  INITIAL_EXPENSES,
  InvoiceLineItem,
} from './asaderoLogic';

const line = (
  productIndex: number,
  quantity: number,
  cutNote = 'Estándar'
): InvoiceLineItem => {
  const product = INITIAL_POS_PRODUCTS[productIndex];
  return {
    lineId: `${productIndex}-${quantity}`,
    product,
    quantity,
    unitPrice: product.price,
    cutNote,
    subtotal: Math.round(product.price * quantity * 100) / 100,
  };
};

test('formatUSD formats dollars with cents and thousands separator', () => {
  assert.equal(formatUSD(14), '$14.00');
  assert.equal(formatUSD(7.75), '$7.75');
  assert.equal(formatUSD(1250.5), '$1,250.50');
  assert.equal(formatUSD(0), '$0.00');
  assert.equal(formatUSD(-3.75), '-$3.75');
});

test('calculateInvoiceTotals extracts IVA 15% from tax-inclusive prices', () => {
  // 2 pollos enteros ($14.00) + 1 medio pollo ($7.75) = $35.75
  const lines = [line(0, 2), line(2, 1)];

  const plain = calculateInvoiceTotals(lines, 0, 'mostrador');
  assert.equal(plain.grossSubtotal, 35.75);
  assert.equal(plain.grandTotal, 35.75);
  assert.equal(plain.netBase, 31.09);
  assert.equal(plain.ivaTax, 4.66);
  assert.equal(plain.netBase + plain.ivaTax, plain.grandTotal);
  assert.equal(plain.totalChickenQuarters, 10);

  const discounted = calculateInvoiceTotals(lines, 10, 'mostrador');
  assert.equal(discounted.discountAmount, 3.58);
  assert.equal(discounted.grandTotal, 32.17);
  assert.equal(discounted.netBase, 27.97);
  assert.equal(discounted.ivaTax, 4.2);

  const delivery = calculateInvoiceTotals(lines, 0, 'domicilio');
  assert.equal(delivery.deliveryCharge, 1.5);
  assert.equal(delivery.grandTotal, 37.25);
  assert.equal(delivery.netBase, 32.39);
  assert.equal(delivery.ivaTax, 4.86);
});

test('seed invoices have consistent SRI totals and change', () => {
  const [first, second, third] = INITIAL_INVOICES;
  assert.equal(first.totals.grandTotal, 16.25);
  assert.equal(first.totals.netBase, 14.13);
  assert.equal(first.totals.ivaTax, 2.12);
  assert.equal(first.changeDue, 3.75);
  assert.equal(second.totals.grandTotal, 42.5);
  assert.equal(third.totals.grandTotal, 20.75);
  assert.equal(first.folio, '001-001-000001041');
});

test('calculateCashChange works in cents', () => {
  assert.deepEqual(calculateCashChange(16.25, 20, 'efectivo'), {
    changeDue: 3.75,
    isSufficient: true,
  });
  assert.equal(calculateCashChange(16.25, 16.24, 'efectivo').isSufficient, false);
  assert.equal(calculateCashChange(0.3, 0.1 + 0.2, 'efectivo').isSufficient, true);
  assert.equal(calculateCashChange(16.25, 0, 'tarjeta').isSufficient, true);
});

test('validateEcuadorianId checks cédula (módulo 10) and RUC structure', () => {
  assert.deepEqual(validateEcuadorianId('1712345675'), { valid: true, type: 'cedula' });
  assert.equal(validateEcuadorianId('1712345670').valid, false);
  assert.equal(validateEcuadorianId('9912345675').valid, false); // provincia inexistente
  assert.deepEqual(validateEcuadorianId('1712345675001'), { valid: true, type: 'ruc' });
  assert.deepEqual(validateEcuadorianId('1792345678001'), { valid: true, type: 'ruc' });
  assert.equal(validateEcuadorianId('1712345670001').valid, false);
  assert.equal(validateEcuadorianId('123').valid, false);
  assert.equal(validateEcuadorianId(CONSUMIDOR_FINAL_ID).type, 'consumidor_final');
});

test('validateInvoiceEmission enforces SRI rules', () => {
  const base = {
    lines: [line(0, 1)],
    customerName: 'CONSUMIDOR FINAL',
    customerTaxId: CONSUMIDOR_FINAL_ID,
    channel: 'mostrador' as const,
    tableOrAddress: 'Mostrador',
    paymentMethod: 'efectivo' as const,
    cashReceived: 100,
  };

  // Consumidor Final: max $50.00
  assert.equal(
    validateInvoiceEmission({ ...base, docType: 'consumidor_final', grandTotal: 50 }).valid,
    true
  );
  assert.equal(
    validateInvoiceEmission({ ...base, docType: 'consumidor_final', grandTotal: 50.01 }).valid,
    false
  );

  // Con datos: needs a real cédula / RUC
  assert.equal(
    validateInvoiceEmission({ ...base, docType: 'con_datos', grandTotal: 14 }).valid,
    false
  );
  assert.equal(
    validateInvoiceEmission({
      ...base,
      docType: 'con_datos',
      customerName: 'María Fernanda Andrade',
      customerTaxId: '1712345670',
      grandTotal: 14,
    }).valid,
    false
  );
  assert.equal(
    validateInvoiceEmission({
      ...base,
      docType: 'con_datos',
      customerName: 'María Fernanda Andrade',
      customerTaxId: '1712345675',
      grandTotal: 14,
    }).valid,
    true
  );

  // Cash must cover the total
  assert.equal(
    validateInvoiceEmission({
      ...base,
      docType: 'consumidor_final',
      cashReceived: 10,
      grandTotal: 14,
    }).valid,
    false
  );
});

test('generateAccessKey builds a 49-digit SRI clave de acceso', () => {
  const key = generateAccessKey({
    date: new Date(2026, 10, 10),
    sequential: 1044,
    numericCode: '12345678',
  });
  assert.equal(key.length, 49);
  assert.match(key, /^\d{49}$/);
  assert.equal(key.slice(0, 8), '10112026');
  assert.equal(key.slice(8, 10), '01');
  assert.equal(key.slice(10, 23), BUSINESS_INFO.ruc);
  assert.equal(key[23], '1'); // ambiente pruebas
  assert.equal(key.slice(24, 30), '001001');
  assert.equal(key.slice(30, 39), '000001044');
  assert.equal(key.slice(39, 47), '12345678');
  assert.equal(key[47], '1'); // emisión normal
  assert.equal(Number(key[48]), mod11CheckDigit(key.slice(0, 48)));
});

test('getNextInvoiceNumber continues the single SRI sequence', () => {
  assert.deepEqual(getNextInvoiceNumber(INITIAL_INVOICES), {
    folio: '001-001-000001044',
    sequential: 1044,
  });
  assert.equal(getNextInvoiceNumber([]).folio, '001-001-000001041');
});

test('calculateCashReconciliation computes expected drawer cash in USD', () => {
  const summary = calculateCashReconciliation(INITIAL_INVOICES, INITIAL_EXPENSES, 100, 101.75);
  assert.equal(summary.cashSales, 16.25);
  assert.equal(summary.cardSales, 20.75);
  assert.equal(summary.transferSales, 42.5);
  assert.equal(summary.totalActiveSales, 79.5);
  assert.equal(summary.totalCashExpenses, 14.5);
  assert.equal(summary.expectedCashInDrawer, 101.75);
  assert.equal(summary.discrepancy, 0);
});

test('calculateChickenKardex tracks whole chickens and quarters sold', () => {
  const kardex = calculateChickenKardex(40, INITIAL_INVOICES, 2);
  assert.equal(kardex.totalQuartersLoaded, 160);
  assert.equal(kardex.quartersSold, 14);
  assert.equal(kardex.remainingQuarters, 144);
  assert.equal(kardex.remainingWholeChickens, 36);
  assert.equal(kardex.remainingLooseQuarters, 0);
});

test('checkStockAvailability blocks overselling units and chicken quarters', () => {
  assert.equal(checkStockAvailability([line(0, 2)], INITIAL_POS_PRODUCTS, 100).ok, true);
  assert.equal(checkStockAvailability([line(0, 29)], INITIAL_POS_PRODUCTS, 1000).ok, false);
  // 3 enteros = 12 quarters but only 10 left on the asador
  assert.equal(checkStockAvailability([line(0, 3)], INITIAL_POS_PRODUCTS, 10).ok, false);
});

test('applyLinesToStock deducts on sale and restores on cancellation', () => {
  const lines = INITIAL_INVOICES[0].lines; // 1 entero + 1 cola
  const sold = applyLinesToStock(INITIAL_POS_PRODUCTS, lines, -1);
  assert.equal(sold[0].stockUnits, INITIAL_POS_PRODUCTS[0].stockUnits - 1);
  assert.equal(sold[0].totalSalesCount, INITIAL_POS_PRODUCTS[0].totalSalesCount + 1);

  const restored = applyLinesToStock(sold, lines, 1);
  assert.equal(restored[0].stockUnits, INITIAL_POS_PRODUCTS[0].stockUnits);
  assert.equal(restored[11].stockUnits, INITIAL_POS_PRODUCTS[11].stockUnits);
});
