// একটা ঘরের লেখাকে CSV-র নিরাপদ রূপে বদলায় (কমা, উদ্ধৃতি চিহ্ন, নতুন লাইন সামলায়)
function cell(v) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function download(filename, text) {
  // শুরুতে BOM দেওয়া হয়েছে, যাতে Excel-এ বাংলা লেখা ঠিক দেখায়
  const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

// সব প্রিন্ট এন্ট্রি (পুরোনো থেকে নতুন ক্রমে)
export function exportEntries(entries) {
  const head = [
    "Date", "Customer Name", "Document Name", "Print Type",
    "Side/Option", "Pages", "Per Unit Cost", "Total Cost", "Status",
  ];
  const rows = entries
    .slice()
    .reverse()
    .map((e) => [
      e.date, e.customerName, e.documentName, e.printType,
      e.side, e.pages, e.unitCost, e.totalCost, e.status,
    ]);
  const text = [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  download(`PrintingZone_Entries_${stamp()}.csv`, text);
}

// কাস্টমার অ্যাকাউন্টের তালিকা
export function exportCustomers(accounts) {
  const head = ["Name", "WhatsApp"];
  const rows = accounts.map((a) => [a.name, a.whatsapp]);
  const text = [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  download(`PrintingZone_Customers_${stamp()}.csv`, text);
}