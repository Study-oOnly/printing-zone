import { sameName } from "./names";

// প্রিন্টের রেট (প্রতি পৃষ্ঠা)
const RATES = {
  "BW-S": 2.5,
  "BW-B": 3.5,
  "BW-C": 2.0,
  "C-S": 3.5,
  "C-B": 4.5,
  "C-P": 6.0,
};

export function getRate(printType, side) {
  return RATES[`${printType}-${side}`] ?? 0;
}

export function calcTotal(pages, unitCost) {
  return Number(pages || 0) * Number(unitCost || 0);
}

// কোনো কাস্টমারের মোট বকেয়া (Partial Payment-এর মাইনাস ধরে), নামের বড়-ছোট হাত উপেক্ষা করে
export function calcUnpaid(entries, customerName) {
  return entries
    .filter((e) => sameName(e.customerName, customerName) && e.status === "Unpaid")
    .reduce((sum, e) => sum + (e.totalCost || 0), 0);
}

// আজকের তারিখ dd/MM/yyyy ফরম্যাটে
export function todayStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}