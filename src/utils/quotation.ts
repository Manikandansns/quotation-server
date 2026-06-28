import { amountToWords, round2, toNumber } from './numbers';

export type QuoteItemInput = {
  serialNo?: number;
  materialId?: string;
  material?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type QuoteTotalsInput = {
  packingCharges?: number;
  transportCharges?: number;
  discount?: number;
  taxPercent?: number;
  roundOff?: number;
};

export const calculateItems = (items: QuoteItemInput[]) => {
  return items.map((item, idx) => {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unitPrice);
    const amount = round2(quantity * unitPrice);

    return {
      ...item,
      serialNo: item.serialNo ?? idx + 1,
      quantity,
      unitPrice,
      amount,
    };
  });
};

export const calculateTotals = (items: QuoteItemInput[], extras: QuoteTotalsInput) => {
  const calculatedItems = calculateItems(items);
  const subtotal = round2(calculatedItems.reduce((sum, row) => sum + row.amount, 0));

  const packingCharges = toNumber(extras.packingCharges);
  const transportCharges = toNumber(extras.transportCharges);
  const discount = toNumber(extras.discount);
  const taxPercent = toNumber(extras.taxPercent);
  const taxAmount = round2(((subtotal + packingCharges + transportCharges - discount) * taxPercent) / 100);
  const roundOff = toNumber(extras.roundOff);

  const grandTotal = round2(subtotal + packingCharges + transportCharges - discount + taxAmount + roundOff);

  return {
    items: calculatedItems,
    subtotal,
    packingCharges,
    transportCharges,
    discount,
    taxPercent,
    taxAmount,
    roundOff,
    grandTotal,
    amountInWords: amountToWords(grandTotal),
  };
};
