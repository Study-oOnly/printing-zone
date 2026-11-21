import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { db, secondaryAuth } from "../firebase";
import { sameName } from "../utils/names";

export default function CustomerAccounts({ entries, names }) {
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(
      collection(db, "customers"),
      (s) => setAccounts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error(e)
    );
  }, []);

  async function create(e) {
    e.preventDefault();
    setMsg("");
    const n = name.trim();
    const num = number.trim();
    if (!n) return setMsg("নাম দিন।");
    if (!/^01\d{9}$/.test(num)) return setMsg("সঠিক ১১ ডিজিটের নম্বর দিন (01XXXXXXXXX)।");
    if (accounts.some((a) => sameName(a.name, n)))
      return setMsg("এই নামে আগেই অ্যাকাউন্ট আছে।");

    setBusy(true);
    try {
      // দ্বিতীয় কানেকশন দিয়ে অ্যাকাউন্ট বানানো, যাতে অ্যাডমিন লগআউট না হয়
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        `${num}@printingzone.app`,
        num
      );
      const uid = cred.user.uid;
      await signOut(secondaryAuth);

      await setDoc(doc(db, "customers", uid), {
        name: n,
        whatsapp: num,
      });

      // আগের এন্ট্রিগুলো এই অ্যাকাউন্টের সাথে জোড়া
      const batch = writeBatch(db);
      let count = 0;
      entries.forEach((en) => {
        if (sameName(en.customerName, n)) {
          batch.update(doc(db, "entries", en.id), { customerUid: uid });
          count++;
        }
      });
      if (count > 0) await batch.commit();

      setMsg(`অ্যাকাউন্ট তৈরি হয়েছে। ${count}টি পুরোনো এন্ট্রি জোড়া লেগেছে।`);
      setName("");
      setNumber("");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use")
        setMsg("এই নম্বরে আগেই অ্যাকাউন্ট আছে।");
      else setMsg("অ্যাকাউন্ট বানানো যায়নি। Console-এর লেখা দেখুন।");
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <h2>কাস্টমার অ্যাকাউন্ট ({accounts.length})</h2>
      <form onSubmit={create}>
        <div className="grid">
          <div>
            <label>কাস্টমারের নাম</label>
            <input list="acc-names" value={name} onChange={(e) => setName(e.target.value)} />
            <datalist id="acc-names">
              {names.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div>
            <label>WhatsApp নম্বর (পাসওয়ার্ডও এটাই)</label>
            <input value={number} inputMode="numeric" placeholder="01XXXXXXXXX"
              onChange={(e) => setNumber(e.target.value)} />
          </div>
        </div>
        <div className="actions">
          <button type="submit" disabled={busy}>{busy ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট বানান"}</button>
        </div>
      </form>
      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr><th>নাম</th><th>WhatsApp</th></tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.whatsapp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}