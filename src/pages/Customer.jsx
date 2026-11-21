import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import CustomerReceipt from "../components/CustomerReceipt";

export default function Customer({ user }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "entries"), where("customerUid", "==", user.uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // নতুন এন্ট্রি আগে
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setEntries(list);
      },
      (e) => {
        console.error(e);
        setError("ডেটা লোড করা যায়নি।");
      }
    );
  }, [user.uid]);

  const unpaid = entries
    .filter((e) => e.status === "Unpaid")
    .reduce((s, e) => s + (e.totalCost || 0), 0);

  const hasUnpaid = entries.some((e) => e.status === "Unpaid");
  const customerName = entries.length > 0 ? entries[0].customerName : "Customer";

  return (
    <div className="pz">
      <header className="pz-nav">
        <div className="pz-logo">Printing<span>Zone</span></div>
        <nav>
          <button className="pz-btn-line" onClick={() => signOut(auth)}>লগআউট</button>
        </nav>
      </header>

      <section className="pz-section">
        <h2>আপনার প্রিন্টের হিসাব</h2>
        <p className="pz-note">নিচে আপনার সব প্রিন্ট ও বকেয়া দেখা যাচ্ছে।</p>

        <div className="pz-rates" style={{ marginBottom: 24 }}>
          <div className="pz-rate">
            <span className="pz-rate-code">মোট বকেয়া</span>
            <span className="pz-rate-price" style={{ color: unpaid > 0 ? "#d9381e" : "#16a34a" }}>
              ৳{unpaid}
            </span>
          </div>
          <div className="pz-rate">
            <span className="pz-rate-code">মোট এন্ট্রি</span>
            <span className="pz-rate-price">{entries.length}</span>
          </div>
        </div>

        {unpaid > 0 && (
          <p className="pz-note">
            পেমেন্ট: Bkash 01816657670 (cashout charge সহ পাঠাবেন)
          </p>
        )}

        {hasUnpaid && (
          <div style={{ marginBottom: 20 }}>
            <button className="pz-btn" onClick={() => setShowReceipt(true)}>
              রিসিপ্ট দেখুন / ডাউনলোড
            </button>
          </div>
        )}

        {error && <p className="pz-error">{error}</p>}

        <div style={{ overflowX: "auto", background: "#fffdf8", border: "1.5px solid #17150f" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
            <thead>
              <tr style={{ background: "#f6f1e7", textAlign: "left" }}>
                <th style={{ padding: 10 }}>তারিখ</th>
                <th style={{ padding: 10 }}>ডকুমেন্ট</th>
                <th style={{ padding: 10 }}>ধরন</th>
                <th style={{ padding: 10 }}>পৃষ্ঠা</th>
                <th style={{ padding: 10 }}>খরচ</th>
                <th style={{ padding: 10 }}>অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid #d9d1c0" }}>
                  <td style={{ padding: 10 }}>{e.date}</td>
                  <td style={{ padding: 10 }}>{e.documentName}</td>
                  <td style={{ padding: 10 }}>{e.printType}</td>
                  <td style={{ padding: 10 }}>{e.pages}</td>
                  <td style={{ padding: 10 }}>৳{e.totalCost}</td>
                  <td style={{ padding: 10, fontWeight: 600, color: e.status === "Paid" ? "#16a34a" : "#d9381e" }}>
                    {e.status === "Paid" ? "পরিশোধিত" : "বকেয়া"}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan="6" style={{ padding: 16 }}>এখনো কোনো এন্ট্রি নেই।</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showReceipt && (
        <CustomerReceipt
          entries={entries}
          customerName={customerName}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}