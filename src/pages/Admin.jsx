import { useEffect, useMemo, useState } from "react";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  writeBatch, doc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { getRate, calcTotal, calcUnpaid, todayStr } from "../utils/pricing";
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
      if (name === "printType" || name === "side") {
        next.unitCost = getRate(next.printType, next.side);
      }
      return next;
    });
  }

  const total = calcTotal(form.pages, form.unitCost);
  const name = form.customerName.trim();
  const customerUnpaid = name ? calcUnpaid(entries, name) : 0;

  // বড়-ছোট হাত মিলিয়ে একই নাম একবারই দেখাবে
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

  // নামের জন্য কাস্টমার অ্যাকাউন্ট থাকলে তার uid
  function uidFor(n) {
    const acc = accounts.find((a) => sameName(a.name, n));
    return acc ? acc.id : "";
  }

  // কাস্টমার অ্যাকাউন্ট থাকলে তার WhatsApp নম্বর
  function phoneFor(n) {
    const acc = accounts.find((a) => sameName(a.name, n));
    return acc ? acc.whatsapp || "" : "";
  }

  // আগে থেকে এই নামে যেভাবে লেখা আছে সেভাবেই লিখবে (rafi → Rafi)
  function canonicalName(n) {
    const found = customerNames.find((x) => sameName(x, n));
    return found || n;
  }

  async function saveEntry(e) {
    e.preventDefault();
    if (!name || !form.pages) return alert("কাস্টমারের নাম ও পৃষ্ঠা সংখ্যা দিন");
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
    if (!name) return alert("আগে কাস্টমারের নাম লিখুন");
    const amount = Number(prompt("কত টাকা দিয়েছে?"));
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
    if (!name) return alert("আগে কাস্টমারের নাম লিখুন");
    const unpaid = entries.filter((e) => sameName(e.customerName, name) && e.status === "Unpaid");
    if (unpaid.length === 0) return alert("কোনো বকেয়া নেই");
    if (!confirm(`${name}-এর ${unpaid.length}টি এন্ট্রি Paid করবেন?`)) return;
    const batch = writeBatch(db);
    unpaid.forEach((e) => batch.update(doc(db, "entries", e.id), { status: "Paid" }));
    await batch.commit();
  }

  function openReceipt() {
    if (!name) return alert("আগে কাস্টমারের নাম লিখুন");
    if (!entries.some((e) => sameName(e.customerName, name) && e.status === "Unpaid"))
      return alert("এই কাস্টমারের কোনো Unpaid আইটেম নেই");
    setShowReceipt(true);
  }

  async function removeEntry(id) {
    if (confirm("এই এন্ট্রি মুছে ফেলবেন?")) await deleteDoc(doc(db, "entries", id));
  }

  return (
    <div className="container">
      <div className="topbar">
        <h1>Printing Zone (Admin)</h1>
        <div className="actions" style={{ marginTop: 0 }}>
          <button className="green" onClick={() => exportEntries(entries)}>ব্যাকআপ: এন্ট্রি</button>
          <button className="green" onClick={() => exportCustomers(accounts)}>ব্যাকআপ: কাস্টমার</button>
          <button className="gray" onClick={() => signOut(auth)}>লগআউট</button>
        </div>
      </div>

      <UploadsList />

      <form className="card" onSubmit={saveEntry}>
        <h2>নতুন এন্ট্রি</h2>
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
            <label>Print Type</label>
            <select value={form.printType} onChange={(e) => setField("printType", e.target.value)}>
              <option>BW</option><option>C</option>
            </select>
          </div>
          <div>
            <label>Side/Option</label>
            <select value={form.side} onChange={(e) => setField("side", e.target.value)}>
              <option>S</option><option>B</option><option>P</option><option>C</option>
            </select>
          </div>
          <div>
            <label>Pages</label>
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
          <button type="submit">এন্ট্রি সেভ করুন</button>
          <button type="button" className="gray" onClick={partialPayment}>Partial Payment</button>
          <button type="button" className="green" onClick={markAllPaid}>Mark All Unpaid as Paid</button>
          <button type="button" onClick={openReceipt}>রিসিপ্ট</button>
        </div>
      </form>

      <CustomerAccounts entries={entries} names={customerNames} />

      <div className="card">
        <h2>সব এন্ট্রি ({filtered.length})</h2>
        <input placeholder="নাম, ডকুমেন্ট বা Paid/Unpaid দিয়ে সার্চ করুন..."
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
                  <td><button className="red" onClick={() => removeEntry(e.id)}>মুছুন</button></td>
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