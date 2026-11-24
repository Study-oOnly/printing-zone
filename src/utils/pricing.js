import { sameName } from "./names";

// Normal print rates (per page)
const RATES = {
  "BW-S": 2.5,
  "BW-B": 3.5,
  "BW-C": 2.0,
  "C-S": 3.5,
  "C-B": 4.5,
  "C-P": 6.0,
};

// Extra services (price per page / piece, side option does not matter)
export const SERVICE_RATES = {
  SCAN: 2,
  PASSPORT: 5,
  GLOSSY: 6,
};

export function isService(printType) {
  return SERVICE_RATES[printType] !== undefined;
}

export function getRate(printType, side) {
  if (isService(printType)) return SERVICE_RATES[printType];
  return RATES[`${printType}-${side}`] ?? 0;
}

export function calcTotal(pages, unitCost) {
  return Number(pages || 0) * Number(unitCost || 0);
}

// Total unpaid for a customer (partial payments are negative), case-insensitive name match
export function calcUnpaid(entries, customerName) {
  return entries
    .filter((e) => sameName(e.customerName, customerName) && e.status === "Unpaid")
    .reduce((sum, e) => sum + (e.totalCost || 0), 0);
}

// Today's date in dd/MM/yyyy
export function todayStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}