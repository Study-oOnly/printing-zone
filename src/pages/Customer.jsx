import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import {
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth, db } from "../firebase";
import CustomerReceipt from "../components/CustomerReceipt";

const css = `
.pbc-wrap { max-width:1180px; margin:0 auto; padding:10px 20px 60px; position:relative; z-index:2; }
.pbc-hello { margin:10px 0 24px; }
.pbc-hello h2 { font-size:clamp(28px,4vw,40px); font-weight:800; letter-spacing:-0.03em; margin:0 0 6px; }
.pbc-hello p { margin:0; color:#5d607a; }
.pbc-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:22px; }
.pbc-stat { background:#fff; border:1px solid #eceefb; border-radius:20px; padding:22px; box-shadow:0 10px 30px rgba(79,61,245,.08); }
.pbc-stat span { font-size:13px; font-weight:700; color:#5d607a; }
.pbc-stat b { display:block; font-size:38px; font-weight:800; letter-spacing:-0.04em; margin-top:6px; }
.pbc-pay { background:#fff; border:1px solid #eceefb; border-radius:20px; padding:18px 22px; margin-bottom:22px; display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; box-shadow:0 10px 30px rgba(79,61,245,.06); }
.pbc-pay p { margin:0; color:#3b3e5c; font-weight:600; }
.pbc-pay small { color:#5d607a; font-weight:500; }
.pbc-tablewrap { background:#fff; border:1px solid #eceefb; border-radius:20px; overflow-x:auto; box-shadow:0 10px 30px rgba(79,61,245,.06); }
.pbc-table { width:100%; border-collapse:collapse; font-size:14.5px; }
.pbc-table th { background:#f4f5ff; color:#3b3e5c; font-size:12.5px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; padding:13px 16px; text-align:left; white-space:nowrap; }
.pbc-table td { padding:13px 16px; border-top:1px solid #eef0fb; white-space:nowrap; }
.pbc-table tbody tr:hover td { background:#fafbff; }
.pbc-badge { display:inline-block; padding:3px 12px; border-radius:99px; font-size:12.5px; font-weight:800; }
.pbc-badge.paid { background:#e6f9ef; color:#16a34a; }
.pbc-badge.unpaid { background:#fff1f1; color:#e5484d; }
.pbc-empty { padding:28px; text-align:center; color:#5d607a; }
.pbc-h3 { font-size:20px; font-weight:800; letter-spacing:-0.02em; margin:0 0 12px; }

.pbc-modal-bg { position:fixed; inset:0; background:rgba(15,13,46,.55); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:20px; z-index:60; }
.pbc-modal { background:#fff; border-radius:22px; padding:28px; width:100%; max-width:400px; box-shadow:0 30px 70px rgba(15,13,46,.35); display:flex; flex-direction:column; gap:14px; }
.pbc-modal h3 { margin:0; font-size:24px; font-weight:800; letter-spacing:-0.03em; }
.pbc-modal label { display:flex; flex-direction:column; gap:6px; font-weight:700; font-size:14px; }
.pbc-modal input { width:100%; padding:12px 14px; border:1.5px solid #e3e6f6; border-radius:14px; background:#f8f9ff; font-family:inherit; font-size:15px; color:#0f0d2e; }
.pbc-modal input:focus { outline:3px solid #d9d3ff; border-color:#4f3df5; background:#fff; }
.pbc-row { display:flex; gap:10px; }
.pbc-ok { margin:0; color:#16a34a; font-weight:700; font-size:14px; }
.pbc-grey { background:#eceefb !important; color:#0f0d2e !important; box-shadow:none !important; }
`;

function ChangePassword({ onClose }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!oldPw) return setMsg("Enter your current password.");
    if (newPw.length < 6) return setMsg("New password must be at least 6 characters.");
    if (newPw !== again) return setMsg("The new passwords do not match.");
    if (newPw === oldPw) return setMsg("New password must be different from the current one.");

    setBusy(true);
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, oldPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setOk(true);
      setMsg("Password changed successfully.");
    } catch (err) {
      console.error(err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/invalid-login-credentials"
      )
        setMsg("Your current password is incorrect.");
      else if (err.code === "auth/too-many-requests")
        setMsg("Too many attempts. Please wait a few minutes and try again.");
      else setMsg("Could not change the password. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="pbc-modal-bg">
      <form className="pbc-modal" onSubmit={submit}>
        <h3>Change password</h3>
        {!ok && (
          <>
            <label>
              Current password
              <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)}
                autoComplete="current-password" />
            </label>
            <label>
              New password
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password" />
            </label>
            <label>
              Confirm new password
              <input type="password" value={again} onChange={(e) => setAgain(e.target.value)}
                autoComplete="new-password" />
            </label>
          </>
        )}
        {msg && (ok ? <p className="pbc-ok">{msg}</p> : <p className="pb-error">{msg}</p>)}
        <div className="pbc-row">
          {!ok && (
            <button className="pb-btn" disabled={busy} type="submit">
              {busy ? "Saving..." : "Save password"}
            </button>
          )}
          <button type="button" className="pb-btn pbc-grey" onClick={onClose}>
            {ok ? "Done" : "Cancel"}
          </button>
        </div>
        {!ok && (
          <p style={{ margin: 0, fontSize: 12.5, color: "#5d607a" }}>
            Forgot your password? Message us on WhatsApp: 01644059191
          </p>
        )}
      </form>
    </div>
  );
}

export default function Customer({ user }) {
  const [entries, setEntries] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // account info (name, batch, number)
  useEffect(() => {
    return onSnapshot(
      doc(db, "customers", user.uid),
      (s) => setProfile(s.exists() ? s.data() : null),
      (e) => console.error(e)
    );
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, "entries"), where("customerUid", "==", user.uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // newest first
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setEntries(list);
        setLoaded(true);
      },
      (e) => {
        console.error(e);
        setError("Could not load your data.");
        setLoaded(true);
      }
    );
  }, [user.uid]);

  const unpaid = entries
    .filter((e) => e.status === "Unpaid")
    .reduce((s, e) => s + (e.totalCost || 0), 0);

  const hasUnpaid = entries.some((e) => e.status === "Unpaid");
  const customerName =
    (profile && profile.name) || (entries.length > 0 ? entries[0].customerName : "Customer");
  const phone = (user.email || "").split("@")[0];

  return (
    <div className="pb">
      <style>{css}</style>

      <nav className="pb-nav">
        <div className="pb-logo">
          <span className="pb-logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </span>
          PrintingZone
        </div>
        <div className="pb-links">
          <button className="pb-login" onClick={() => setShowPw(true)}>Change password</button>
          <button className="pb-login" onClick={() => signOut(auth)}>Log out</button>
        </div>
      </nav>

      <div className="pbc-wrap">
        <div className="pbc-hello">
          <h2>Hi, {customerName}</h2>
          <p>Account: {phone}. Here is a summary of your prints and dues.</p>
        </div>

        <div className="pbc-stats">
          <div className="pbc-stat">
            <span>Total due</span>
            <b style={{ color: unpaid > 0 ? "#e5484d" : "#16a34a" }}>৳{unpaid}</b>
          </div>
          <div className="pbc-stat">
            <span>Total entries</span>
            <b>{entries.length}</b>
          </div>
        </div>

        {unpaid > 0 && (
          <div className="pbc-pay">
            <p>
              Pay with bKash: 01816657670
              <br />
              <small>Please include the cashout charge.</small>
            </p>
            {hasUnpaid && (
              <button className="pb-btn" onClick={() => setShowReceipt(true)}>
                View / Download Receipt
              </button>
            )}
          </div>
        )}

        {error && <p className="pb-error">{error}</p>}

        <h3 className="pbc-h3">Your prints</h3>
        <div className="pbc-tablewrap">
          <table className="pbc-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Document</th>
                <th>Type</th>
                <th>Pages</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.documentName}</td>
                  <td>{e.printType}</td>
                  <td>{e.pages}</td>
                  <td>৳{e.totalCost}</td>
                  <td>
                    <span className={`pbc-badge ${e.status === "Paid" ? "paid" : "unpaid"}`}>
                      {e.status === "Paid" ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                </tr>
              ))}
              {loaded && entries.length === 0 && (
                <tr><td colSpan="6" className="pbc-empty">No prints yet.</td></tr>
              )}
              {!loaded && (
                <tr><td colSpan="6" className="pbc-empty">Loading...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showReceipt && (
        <CustomerReceipt
          entries={entries}
          customerName={customerName}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {showPw && <ChangePassword onClose={() => setShowPw(false)} />}
    </div>
  );
}