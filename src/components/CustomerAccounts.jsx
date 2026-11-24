import { useEffect, useRef, useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { db, secondaryAuth } from "../firebase";
import { sameName, nameKey } from "../utils/names";

export default function CustomerAccounts({ entries, names }) {
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const linking = useRef(false);
  const filled = useRef(false);

  useEffect(() => {
    return onSnapshot(
      collection(db, "customers"),
      (s) => setAccounts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error(e)
    );
  }, []);

  // Names are unique, so entries are linked to the account with the same name automatically
  useEffect(() => {
    if (linking.current || accounts.length === 0 || entries.length === 0) return;
    const batch = writeBatch(db);
    let n = 0;
    entries.forEach((en) => {
      const acc = accounts.find((a) => sameName(a.name, en.customerName));
      if (acc && en.customerUid !== acc.id && n < 400) {
        batch.update(doc(db, "entries", en.id), { customerUid: acc.id });
        n++;
      }
    });
    if (n === 0) return;
    linking.current = true;
    batch
      .commit()
      .catch((e) => console.error(e))
      .finally(() => { linking.current = false; });
  }, [entries, accounts]);

  // Make sure every account's name and number are in the lookup lists (runs once)
  useEffect(() => {
    if (filled.current || accounts.length === 0) return;
    filled.current = true;
    accounts.forEach((a) => {
      if (a.name && a.whatsapp) {
        setDoc(doc(db, "names", nameKey(a.name)), { name: a.name, whatsapp: a.whatsapp })
          .catch((e) => console.error(e));
        setDoc(doc(db, "phones", a.whatsapp), { name: a.name })
          .catch((e) => console.error(e));
      }
    });
  }, [accounts]);

  async function create(e) {
    e.preventDefault();
    setMsg("");
    const n = name.trim();
    const num = number.trim();
    if (!n) return setMsg("Please enter a name.");
    if (!/^01\d{9}$/.test(num)) return setMsg("Enter a valid 11-digit number (01XXXXXXXXX).");
    if (accounts.some((a) => sameName(a.name, n)))
      return setMsg("This name is already used by another customer. Add a few digits or a surname to make it different.");

    setBusy(true);
    try {
      // the name must not belong to someone with a different number
      const nref = doc(db, "names", nameKey(n));
      const ex = await getDoc(nref);
      if (ex.exists() && ex.data().whatsapp !== num) {
        setBusy(false);
        return setMsg("This name is already used by another customer. Add a few digits or a surname to make it different.");
      }

      // use a second connection so the admin does not get logged out
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        `${num}@printingzone.app`,
        num
      );
      const uid = cred.user.uid;
      await signOut(secondaryAuth);

      await setDoc(doc(db, "customers", uid), { name: n, whatsapp: num });
      await setDoc(nref, { name: n, whatsapp: num });
      await setDoc(doc(db, "phones", num), { name: n });

      setMsg("Account created. Older entries with this name are linked automatically.");
      setName("");
      setNumber("");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use")
        setMsg("An account with this number already exists.");
      else setMsg("Could not create the account. Check the browser console.");
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <h2>Customer Accounts ({accounts.length})</h2>
      <form onSubmit={create}>
        <div className="grid">
          <div>
            <label>Customer Name</label>
            <input list="acc-names" value={name} onChange={(e) => setName(e.target.value)} />
            <datalist id="acc-names">
              {names.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div>
            <label>WhatsApp Number (also the password)</label>
            <input value={number} inputMode="numeric" placeholder="01XXXXXXXXX"
              onChange={(e) => setNumber(e.target.value)} />
          </div>
        </div>
        <div className="actions">
          <button type="submit" disabled={busy}>{busy ? "Creating..." : "Create Account"}</button>
        </div>
      </form>
      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr><th>Name</th><th>Batch</th><th>WhatsApp</th></tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.batch || "-"}</td>
                <td>{a.whatsapp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}