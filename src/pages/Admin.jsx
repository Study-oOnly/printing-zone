import { useEffect, useMemo, useState } from "react";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  writeBatch, doc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { getRate, calcTotal, calcUnpaid, todayStr, isService } from "../utils/pricing";
import { sameName, normName } from "../utils/names";
import { exportEntries, exportCustomers } from "../utils/exportCsv";
import UploadsList from "../components/UploadsList";
import Receipt from "../components/Receipt";
import CustomerAccounts from "../components/CustomerAccounts";

export default function Admin() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [form, setForm] = useState({
    date: todayStr(),
    customerName: "",
    documentName: "",
    printType: "BW",
    side: "S",
    pages: "",
    unitCost: 2.5,
    status: "Unpaid",
  });

  useEffect(() => {
    const q = query(collection(db, "entries"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "customers"), (snap) => {
      setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));
  }, []);

  function setField(name, value) {
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === "printType") {
        if (isService(value)) next.side = "-";
        else if (next.side === "-") next.side = "S";
      }
      if (name === "printType" || name === "side") {
        next.unitCost = getRate(next.printType, next.side);
      }
      return next;
    });
  }

  const total = calcTotal(form.pages, form.unitCost);
  const name = form.customerName.trim();
  const customerUnpaid = name ? calcUnpaid(entries, name) : 0;

  // same name in different letter case appears only once
  const customerNames = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const k = normName(e.customerName);
      if (k && !map.has(k)) map.set(k, e.customerName);
    });
    accounts.forEach((a) => {
      const k = normName(a.name);
      if (k && !map.has(k)) map.set(k, a.name);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [entries, accounts]);

  const filtered = entries.filter((e) => {
    const s = search.toLowerCase();
    return (
      !s ||
      (e.customerName || "").toLowerCase().includes(s) ||
      (e.documentName || "").toLowerCase().includes(s) ||
      (e.status || "").toLowerCase().includes(s)
    );
  });

  function uidFor(n) {
    const acc = accounts.find((a) => sameName(a.name, n));
    return acc ? acc.id : "";
  }

  function phoneFor(n) {
    const acc = accounts.find((a) => sameName(a.name, n));
    return acc ? acc.whatsapp || "" : "";
  }

  function canonicalName(n) {
    const found = customerNames.find((x) => sameName(x, n));
    return found || n;
  }

  async function saveEntry(e) {
    e.preventDefault();
    if (!name || !form.pages) return alert("Please enter customer name and pages/quantity");
    const finalName = canonicalName(name);
    await addDoc(collection(db, "entries"), {
      date: form.date,
      customerName: finalName,
      customerUid: uidFor(finalName),
      documentName: form.documentName,
      printType: form.printType,
      side: form.side,
      pages: Number(form.pages),
      unitCost: Number(form.unitCost),
      totalCost: total,
      status: form.status,
      createdAt: serverTimestamp(),
    });
    setForm((f) => ({ ...f, customerName: finalName, documentName: "", pages: "" }));
  }

  async function partialPayment() {
    if (!name) return alert("Enter the customer name first");
    const amount = Number(prompt("How much did the customer pay?"));
    if (!amount || amount <= 0) return;
    const finalName = canonicalName(name);
    await addDoc(collection(db, "entries"), {
      date: form.date,
      customerName: finalName,
      customerUid: uidFor(finalName),
      documentName: "Partial Payment",
      printType: "-",
      side: "-",
      pages: 0,
      unitCost: 0,
      totalCost: -amount,
      status: "Unpaid",
      createdAt: serverTimestamp(),
    });
  }

  async function markAllPaid() {
    if (!name) return alert("Enter the customer name first");
    const unpaid = entries.filter((e) => sameName(e.customerName, name) && e.status === "Unpaid");
    if (unpaid.length === 0) return alert("No unpaid entries");
    if (!confirm(`Mark ${unpaid.length} entries of ${name} as Paid?`)) return;
    const batch = writeBatch(db);
    unpaid.forEach((e) => batch.update(doc(db, "entries", e.id), { status: "Paid" }));
    await batch.commit();
  }

  function openReceipt() {
    if (!name) return alert("Enter the customer name first");
    if (!entries.some((e) => sameName(e.customerName, name) && e.status === "Unpaid"))
      return alert("This customer has no unpaid items");
    setShowReceipt(true);
  }

  async function removeEntry(id) {
    if (confirm("Delete this entry?")) await deleteDoc(doc(db, "entries", id));
  }

  return (
    <div className="container">
      <div className="topbar">
        <h1>Printing Zone (Admin)</h1>
        <div className="actions" style={{ marginTop: 0 }}>
          <button className="green" onClick={() => exportEntries(entries)}>Backup: Entries</button>
          <button className="green" onClick={() => exportCustomers(accounts)}>Backup: Customers</button>
          <button className="gray" onClick={() => signOut(auth)}>Logout</button>
        </div>
      </div>

      <UploadsList />

      <form className="card" onSubmit={saveEntry}>
        <h2>New Entry</h2>
        <div className="grid">
          <div>
            <label>Date</label>
            <input value={form.date} onChange={(e) => setField("date", e.target.value)} />
          </div>
          <div>
            <label>Customer Name</label>
            <input list="names" value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)} />
            <datalist id="names">
              {customerNames.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div>
            <label>Total Unpaid</label>
            <input readOnly value={`৳ ${customerUnpaid}`} />
          </div>
          <div>
            <label>Document Name</label>
            <input value={form.documentName}
              onChange={(e) => setField("documentName", e.target.value)} />
          </div>
          <div>
            <label>Print Type / Service</label>
            <select value={form.printType} onChange={(e) => setField("printType", e.target.value)}>
              <option value="BW">BW (Black &amp; White)</option>
              <option value="C">C (Color)</option>
              <option value="SCAN">Scan</option>
              <option value="PASSPORT">Passport Photo</option>
              <option value="GLOSSY">Glossy Paper Print</option>
            </select>
          </div>
          <div>
            <label>Side/Option</label>
            <select value={form.side} onChange={(e) => setField("side", e.target.value)}
              disabled={isService(form.printType)}>
              <option value="S">S (Single side)</option>
              <option value="B">B (Both side)</option>
              <option value="P">P (Photo)</option>
              <option value="C">C (Cover page)</option>
              {isService(form.printType) && <option value="-">-</option>}
            </select>
          </div>
          <div>
            <label>Pages / Qty</label>
            <input type="number" value={form.pages}
              onChange={(e) => setField("pages", e.target.value)} />
          </div>
          <div>
            <label>Per Unit Cost</label>
            <input type="number" step="0.5" value={form.unitCost}
              onChange={(e) => setField("unitCost", e.target.value)} />
          </div>
          <div>
            <label>Total Cost</label>
            <input readOnly value={`৳ ${total}`} />
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option>Unpaid</option><option>Paid</option>
            </select>
          </div>
        </div>
        <div className="actions">
          <button type="submit">Save Entry</button>
          <button type="button" className="gray" onClick={partialPayment}>Partial Payment</button>
          <button type="button" className="green" onClick={markAllPaid}>Mark All Unpaid as Paid</button>
          <button type="button" onClick={openReceipt}>Receipt</button>
        </div>
      </form>

      <CustomerAccounts entries={entries} names={customerNames} />

      <div className="card">
        <h2>All Entries ({filtered.length})</h2>
        <input placeholder="Search by name, document or Paid/Unpaid..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <br /><br />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Customer</th><th>Document</th><th>Type</th>
                <th>Side</th><th>Pages</th><th>Unit</th><th>Total</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.customerName}</td>
                  <td>{e.documentName}</td>
                  <td>{e.printType}</td>
                  <td>{e.side}</td>
                  <td>{e.pages}</td>
                  <td>{e.unitCost}</td>
                  <td>৳ {e.totalCost}</td>
                  <td className={e.status === "Paid" ? "paid" : "unpaid"}>{e.status}</td>
                  <td><button className="red" onClick={() => removeEntry(e.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showReceipt && (
        <Receipt
          entries={entries}
          customerName={canonicalName(name)}
          phone={phoneFor(name)}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}