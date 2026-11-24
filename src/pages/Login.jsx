import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { createCustomerAccount, isValidPhone } from "../utils/signup";

// If a customer types a phone number, build the hidden email from it
export function toEmail(id) {
  const v = id.trim();
  return v.includes("@") ? v : `${v}@printingzone.app`;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.pbl { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
  background:#f1f3fd; position:relative; overflow:hidden;
  font-family:'Plus Jakarta Sans',Arial,sans-serif; color:#0f0d2e; }
.pbl * { box-sizing:border-box; }
.pbl-blob { position:absolute; border-radius:50%; filter:blur(70px); pointer-events:none; }
.pbl-blob.a { width:420px; height:420px; background:#c9b8ff; right:-80px; top:-80px; opacity:.55; }
.pbl-blob.b { width:340px; height:340px; background:#b7f0d8; left:-60px; bottom:-60px; opacity:.45; }
.pbl-blob.c { width:260px; height:260px; background:#ffc9e3; right:20%; bottom:-80px; opacity:.35; }
.pbl-wrap { width:100%; max-width:420px; position:relative; z-index:2; }
.pbl-logo { display:flex; align-items:center; justify-content:center; gap:8px; font-size:28px; font-weight:800; letter-spacing:-0.04em; margin-bottom:22px; }
.pbl-mark { width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg,#4f3df5,#7c5cff); display:grid; place-items:center; }
.pbl-card { background:#fff; border:1px solid #eceefb; border-radius:24px; padding:32px; box-shadow:0 18px 50px rgba(79,61,245,.12); display:flex; flex-direction:column; gap:16px; }
.pbl-back { background:none; border:none; padding:0; color:#5d607a; font-family:inherit; font-size:14px; font-weight:600; cursor:pointer; text-align:left; width:fit-content; }
.pbl-back:hover { color:#4f3df5; }
.pbl-card h2 { margin:0; font-size:30px; font-weight:800; letter-spacing:-0.03em; }
.pbl-sub { margin:-8px 0 0; color:#5d607a; font-size:14.5px; }
.pbl-card label { display:flex; flex-direction:column; gap:6px; font-weight:700; font-size:14px; }
.pbl-card label i { color:#e5484d; font-style:normal; }
.pbl-card input { width:100%; padding:13px 16px; border:1.5px solid #e3e6f6; border-radius:14px; background:#f8f9ff; font-family:inherit; font-size:15px; color:#0f0d2e; }
.pbl-card input:focus { outline:3px solid #d9d3ff; border-color:#4f3df5; background:#fff; }
.pbl-btn { display:flex; justify-content:center; align-items:center; background:linear-gradient(135deg,#4f3df5,#7c5cff); color:#fff; border:none; border-radius:99px; padding:14px 28px; font-weight:700; font-size:15px; cursor:pointer; font-family:inherit; box-shadow:0 10px 24px rgba(79,61,245,.35); transition:transform .15s; }
.pbl-btn:hover { transform:translateY(-2px); }
.pbl-btn:disabled { opacity:.6; cursor:wait; transform:none; }
.pbl-error { color:#e5484d; font-weight:600; margin:0; font-size:14px; }
.pbl-hint { margin:0; text-align:center; color:#5d607a; font-size:13px; }
.pbl-switch { background:none; border:none; padding:0; color:#4f3df5; font-weight:700; font-family:inherit; font-size:13px; cursor:pointer; }
.pbl-switch:hover { text-decoration:underline; }
`;

export default function Login({ onBack }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(m) {
    setMode(m);
    setError("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, toEmail(id), password);
    } catch (err) {
      setError("Incorrect number/email or password.");
    }
    setBusy(false);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    const num = phone.trim();
    if (!name.trim() || !batch.trim()) return setError("Name and batch are required.");
    if (!isValidPhone(num)) return setError("Enter a valid 11-digit WhatsApp number (01XXXXXXXXX).");

    setBusy(true);
    const r = await createCustomerAccount({ name, batch, whatsapp: num });
    if (r.status === "created") {
      try {
        // Log in right away. The password is the same number.
        await signInWithEmailAndPassword(auth, toEmail(num), num);
      } catch (err) {
        setError("Account created. Please log in with your number as the password.");
        setMode("login");
        setId(num);
      }
    } else if (r.status === "exists") {
      setError("An account with this number already exists. Please log in.");
      setMode("login");
      setId(num);
    } else {
      setError("Could not create the account. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="pbl">
      <style>{css}</style>
      <div className="pbl-blob a" />
      <div className="pbl-blob b" />
      <div className="pbl-blob c" />

      <div className="pbl-wrap">
        <div className="pbl-logo">
          <span className="pbl-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </span>
          PrintingZone
        </div>

        {mode === "login" ? (
          <form className="pbl-card" onSubmit={handleLogin}>
            <button type="button" className="pbl-back" onClick={onBack}>← Back to home</button>
            <h2>Welcome back</h2>
            <p className="pbl-sub">Log in to see your prints and dues.</p>

            <label>
              WhatsApp Number
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="01XXXXXXXXX"
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </label>

            {error && <p className="pbl-error">{error}</p>}

            <button className="pbl-btn" disabled={busy}>
              {busy ? "Logging in..." : "Log in"}
            </button>
            <p className="pbl-hint">
              New here?{" "}
              <button type="button" className="pbl-switch" onClick={() => switchMode("signup")}>
                Create account
              </button>
            </p>
            <p className="pbl-hint">Forgot your password? WhatsApp us: 01644059191</p>
          </form>
        ) : (
          <form className="pbl-card" onSubmit={handleSignup}>
            <button type="button" className="pbl-back" onClick={() => switchMode("login")}>← Back to login</button>
            <h2>Create account</h2>
            <p className="pbl-sub">Your WhatsApp number is your ID and your first password.</p>

            <label>
              <span>Name <i>*</i></span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>
            <label>
              <span>Batch <i>*</i></span>
              <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. 24th" />
            </label>
            <label>
              <span>WhatsApp Number <i>*</i></span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
              />
            </label>

            {error && <p className="pbl-error">{error}</p>}

            <button className="pbl-btn" disabled={busy}>
              {busy ? "Creating..." : "Create account"}
            </button>
            <p className="pbl-hint">You can change your password after logging in.</p>
          </form>
        )}
      </div>
    </div>
  );
}